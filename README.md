# screenshot-glb-gif
create gifs from glb files using puppeteer-screen-recorder
currently defaults to mov files with transparency for converting to transparent gif

Can then convert to gif like so
`ffmpeg -i file.mov -vf "fps=24,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 -f gif - | gifsicle --optimize=3 --colors 16 --delay 8 > out.gif`

## Install

1. `git clone git@github.com:madjin/screenshot-glb-gif.git`
2. `cd screenshot-glb-gif`
3. first run modelviewer-generator.sh on folder of glb files
4. then run a web server where those glb files are (`python3 -m http.server`)
5. configure url path in `record_animation.js`
6. npm install

## Running
If you just have one:
`node record_animatoin2.js -i http://localhost:8000/mymodel.html -o out.mov`

If you have many glb files, put the urls in a text file then run:
`node record_animation.js -i list_of_urls.txt -o out_folder`

Note: if you have a new folder of glbs, run `bash modelviewer-generator.sh folder` on it to generate the html files
