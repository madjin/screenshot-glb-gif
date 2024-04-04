const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const yargs = require('yargs');
const { execSync } = require('child_process');

//// Function to print a progress bar
//function progressBar(currentFrame, totalFrames) {
//  const width = 50;
//  const numChars = Math.floor((currentFrame / totalFrames) * width);
//  const bar = '[' + '#'.repeat(numChars) + ' '.repeat(width - numChars) + ']';
//  process.stdout.clearLine();
//  process.stdout.cursorTo(0);
//  process.stdout.write(bar + ' ' + currentFrame + '/' + totalFrames);
//}

function progressBar(currentFrame, totalFrames) {
  const width = 50;
  const progress = (currentFrame / totalFrames) * 100;
  const numChars = Math.floor((currentFrame / totalFrames) * width);
  const bar = '[' + '#'.repeat(numChars) + ' '.repeat(width - numChars) + ']';
  process.stdout.write('\r' + bar + ' ' + progress.toFixed(2) + '%');
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
    describe: 'URL of the HTML page to record',
    demandOption: true,
    type: 'string',
  })
  .option('output', {
    alias: 'o',
    describe: 'Output path for the video export',
    demandOption: true,
    type: 'string',
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
  const browser = await puppeteer.launch({
    headless: true,
    args: minimal_args,
  });
  const page = await browser.newPage();
  await page.goto(argv.input);

  const viewportSize = await page.evaluate(() => {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
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
  await client.send("Emulation.setDefaultBackgroundColorOverride", {
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
    progressBar(i + 1, argv.frames);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  await recorder.start(argv.output);

  // Record the spinning animation for the specified number of frames
  for (let i = 0; i < argv.frames; i++) {
    const currentRotation = i * rotationIncrement;
    await page.evaluate((currentRotation) => {
      const modelViewer = document.querySelector('model-viewer');
      modelViewer.setAttribute('camera-orbit', `${currentRotation}deg 80deg 0`);
    }, currentRotation);
    await new Promise(resolve => setTimeout(resolve, 500 / argv.fps));
  }

  await recorder.stop();
  process.stdout.write('\n');
  await browser.close();

  setTimeout(() => {
    process.exit(0);
  }, 500);
})();
