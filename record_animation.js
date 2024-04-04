const puppeteer = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs');
const { execSync } = require('child_process');

// Function to print a progress bar
function progressBar(currentFrame, totalFrames, currentFile, totalFiles) {
  const width = 50;
  const numChars = Math.floor((currentFrame / totalFrames) * width);
  const bar = '[' + '#'.repeat(numChars) + ' '.repeat(width - numChars) + ']';
  console.log(`File ${currentFile}/${totalFiles}: ${bar} ${currentFrame}/${totalFrames}`);
}

const minimal_args = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--use-gl=desktop',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
];

// Parse command line arguments
const argv = yargs
  .option('input', {
    alias: 'i',
    describe: 'Path to the input file containing URLs',
    demandOption: true,
    type: 'string',
  })
  .option('output', {
    alias: 'o',
    describe: 'Output directory for the video exports',
    demandOption: true,
    type: 'string',
  })
  .option('parallel', {
    alias: 'p',
    describe: 'Number of parallel workers',
    default: 1,
    type: 'number',
  })
  .option('format', {
    describe: 'Video format (e.g., mp4)',
    default: 'mov',
    type: 'string',
  })
  .option('frames', {
    describe: 'Number of frames to record',
    default: 48,
    type: 'number',
  })
  .option('fps', {
    describe: 'Frames per second',
    default: 24	,
    type: 'number',
  })
  .option('preset', {
    describe: 'FFmpeg preset configuration',
    default: 'fast',
    type: 'string',
  })
  .help()
  .argv;

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: argv.parallel,
    puppeteerOptions: {
      headless: true,
      args: minimal_args,
    },
  });

  let processedFiles = 0;

  await cluster.task(async ({ page, data: { url, outputPath, currentFile, totalFiles } }) => {
    await page.goto(url);

    const viewportSize = await page.evaluate(() => {
      return {
        width: 480,
        height: 360,
        deviceScaleFactor: window.devicePixelRatio,
      };
    });
    await page.setViewport(viewportSize);
    await page.waitForSelector('model-viewer');

    const recorderOptions = {
      fps: argv.fps,
      format: 'png',
      videoCodec: 'png',
      videoPixelFormat: 'rgba',
      transparent: true,
    };

    const recorder = new PuppeteerScreenRecorder(page, recorderOptions);

    const client = await page.target().createCDPSession();
    await client.send('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });

    await page.evaluate(() => {
      const modelViewer = document.querySelector('model-viewer');
      modelViewer.resetTurntableRotation(0);
    });

    const totalRotation = 360;
    const rotationIncrement = totalRotation / argv.frames;
    // Start the animation loop
    for (let i = 0; i < argv.frames; i++) {
      const currentRotation = i * rotationIncrement;
      await page.evaluate((currentRotation) => {
        const modelViewer = document.querySelector('model-viewer');
        modelViewer.setAttribute('camera-orbit', `${currentRotation}deg 80deg 0`);
      }, currentRotation);
      await new Promise(resolve => setTimeout(resolve, 500 / argv.fps));
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    await recorder.start(outputPath);

    for (let i = 0; i < argv.frames; i++) {
      const currentRotation = i * rotationIncrement;
      await page.evaluate((currentRotation) => {
        const modelViewer = document.querySelector('model-viewer');
        modelViewer.setAttribute('camera-orbit', `${currentRotation}deg 80deg 0`);
      }, currentRotation);
      await new Promise((resolve) => setTimeout(resolve, 500 / argv.fps));
    }

    await recorder.stop();

    processedFiles++;
    console.log(`Processed ${processedFiles}/${totalFiles} files`);
  });

  const urls = fs.readFileSync(argv.input, 'utf-8').split('\n').filter(Boolean);
  const totalFiles = urls.length;

  for (let i = 0; i < totalFiles; i++) {
    const url = urls[i];
    const dirName = url.replace('http://0.0.0.0:8002/glb_xmp/', '').split('/')[0];
    const fileName = url.split('/').pop().replace('.html', '');
    const outputDir = `${argv.output}/${dirName}`;
    fs.mkdirSync(outputDir, { recursive: true });
    cluster.queue({ url, outputPath: `${outputDir}/${fileName}.mov`, currentFile: i + 1, totalFiles });
  }

  await cluster.idle();
  await cluster.close();

  console.log('Processing completed.');
})();
