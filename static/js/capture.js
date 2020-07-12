
// calculates scale to fit into (640x480) bbox
function get_scale(img_h, img_w) {
    var smallest_side = Math.min(img_h, img_w);
    var scale = 480 / smallest_side;
    var largest_side = Math.max(img_h, img_w);
    if (largest_side * scale > 640) { scale = 640 / largest_side; }
    return scale;
}


(function() {

    var width = 640;
    var height = 0;

    var streaming = false;

    var video = null;
    var canvas = null;
    var photo = null;
    var estimate_button = null;

    // downlaod buttons
    var download_image = null;
    var download_json = null;

    // input mode radio buttons
    var webcamChoice = null;
    var imageChoice = null;
    var urlChoice = null;

    // called as page is fully loaded
    function startup() {

        webcamChoice = document.getElementById('webcamChoice');
        imageChoice = document.getElementById('imageChoice');
        urlChoice = document.getElementById('urlChoice');

        buttons = [webcamChoice, imageChoice, urlChoice];

        // page is being reloaded every time input mode changes using radio buttons
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', _ => window.location.reload(false));
        }

        canvas = document.getElementById('canvas');
        photo = document.getElementById('photo');
        estimate_button = document.getElementById('estimate_button');

        download_image = document.getElementById('download_image');
        download_json = document.getElementById('download_json');

        if (webcamChoice.checked) {

            document.getElementById('uploaded_image').style.display = 'none';
            document.getElementById('url_image').style.display = 'none';

            document.getElementById('file_form').style.display = 'none';
            document.getElementById('link_form').style.display = 'none';

            video = document.getElementById('video');

            navigator.mediaDevices.getUserMedia({video: true, audio: false})
            .then(function(stream){
                video.srcObject = stream;
                video.play();
            })
            .catch(function(err) {
                console.log("An error occurred: " + err)
            });

            video.addEventListener('canplay', function(ev) {
                if (!streaming) {
                    height = video.videoHeight / (video.videoWidth / width);

                    if (isNaN(height)) {
                        height = width / (4/3);
                    }

                    video.setAttribute('width', width);
                    video.setAttribute('height', height);
                    canvas.setAttribute('width', width);
                    canvas.setAttribute('height', height);
                    streaming = true;
                }
            }, false);

        } else if (imageChoice.checked) {
            height = 480;
            document.getElementById('video').style.display = 'none';
            document.getElementById('link_form').style.display = 'none';
            document.getElementById('url_image').style.display = 'none';
        } else if (urlChoice.checked) {
            height = 480;
            document.getElementById('uploaded_image').style.display = 'none';
            document.getElementById('file_form').style.display = 'none';
            document.getElementById('video').style.display = 'none';
        }

        estimate_button.addEventListener('click', function(ev){
            processImage();
            ev.preventDefault();
        }, false);

        download_json.addEventListener('click', function(ev){
            downloadFile('current_prediction');
        }, false);

        download_image.addEventListener('click', function(ev){
            downloadFile('current_canvas');
        }, false);

        emptyImage();
    }

    // implements functionality for file download (annotation/image)
    function downloadFile(localStorageKey) {
       var data = localStorage.getItem(localStorageKey);
       if (localStorageKey == "current_prediction") {
            var data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.parse(JSON.stringify(data)));
            var fileName = "prediction.json";
       } else if (localStorageKey == "current_canvas") {
            var fileName = "image.png"
       }
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href", data);
        dlAnchorElem.setAttribute("download", fileName);
        dlAnchorElem.click();
    }

    // fills output image with black color if there is not image input to evaluate
    function emptyImage() {
        var context = canvas.getContext('2d');
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas.width, canvas.height);
        var data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }

    // runs emotion recognition based on given input mode
    async function processImage() {

        var context = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        if (webcamChoice.checked) {
            if (streaming) {
                context.drawImage(video, 0, 0, width, height);
            } else {
                emptyImage();
            }
        } else if (imageChoice.checked) {
            image_input = document.getElementById('file_input');
            img = document.getElementById('uploaded_image');
            var temp_image = new Image;

            if (image_input.files[0]) {
                var promise = await new Promise(function(resolve, reject){
                   temp_image.onload = function () {resolve();};
                   temp_image.src = URL.createObjectURL(image_input.files[0]);
                });
                // rescale image to fit into input/output areas
                var img_h = temp_image.height;
                var img_w = temp_image.width;
                var scale = get_scale(img_h, img_w);
                dWidth = Math.floor(scale * img_w);
                dHeight = Math.floor(scale * img_h);

                context.drawImage(temp_image, 0, 0, dWidth, dHeight);
                img.setAttribute('src', canvas.toDataURL('image/png'));
            } else {
                emptyImage();
            }
        } else if (urlChoice.checked) {
            url_input = document.getElementById('link_input');
            img = document.getElementById('url_image');
            var temp_image = new Image;

            if (url_input.value) {
                var promise = await new Promise(function(resolve, reject){
                    temp_image.onload = function () {resolve();};
                    temp_image.setAttribute('crossOrigin', 'anonymous');
                    temp_image.src = url_input.value;
                });
                // rescale image to fit into input/output areas
                var img_h = temp_image.height;
                var img_w = temp_image.width;
                var scale = get_scale(img_h, img_w);
                dWidth = Math.floor(scale * img_w);
                dHeight = Math.floor(scale * img_h);

                context.drawImage(temp_image, 0, 0, dWidth, dHeight);
                img.setAttribute('src', canvas.toDataURL('image/png'));
            } else {
                emptyImage();
            }
        }

        // cache image for possible Download action
        localStorage.setItem('current_canvas', canvas.toDataURL('image/png'));
        let imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        prediction = makePrediction(imageBlob);

        prediction.then(function(result) {

            for (var face_id in result) {
                bbox = result[face_id]['bbox']
                score = result[face_id]['score']
                category = result[face_id]['category']

                context.beginPath();
                context.lineWidth = "4";
                context.strokeStyle = "red";
                context.rect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
                context.stroke();

                context.font = "25px Ubuntu Mono";
                context.fillStyle = "red";
                context.fillText(category + ': ' + score.toFixed(2).toString(), bbox[0], bbox[1] - 15);
            }

        photo.setAttribute('src', canvas.toDataURL('image/png'));
        localStorage.setItem('current_prediction', JSON.stringify(result))

        }, function(error) {
            console.error("Error making prediction " + error);
        });
    }

    async function makePrediction(imageBlob) {
        let formData = new FormData();
        formData.append('image', imageBlob, 'image.png');
        let response = await fetch('/api', {
            method: 'POST',
            body: formData
        });
        let result = await response.json();
        return result
    }

    window.addEventListener('load', startup, false);
})();
