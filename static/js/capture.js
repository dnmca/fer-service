

(function() {

    var width = 640;
    var height = 0;

    var streaming = false;

    var video = null;
    var canvas = null;
    var photo = null;
    var estimate_button = null;

    var download_image = null;
    var download_json = null;

    var upload_image = null;
    var submit_url = null;

    function startup() {

        canvas = document.getElementById('canvas');
        photo = document.getElementById('photo');
        estimate_button = document.getElementById('estimate_button');

        download_image = document.getElementById('download_image');
        download_json = document.getElementById('download_json');

        if (document.getElementById('webcamChoice').checked) {

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

        } else if (document.getElementById('imageChoice').checked) {
            document.getElementById('video').style.display = 'none';
            document.getElementById('link_form').style.display = 'none';
            document.getElementById('url_image').style.display = 'none';

        } else if (document.getElementById('urlChoice').checked) {
            document.getElementById('uploaded_image').style.display = 'none';
            document.getElementById('file_form').style.display = 'none';
            document.getElementById('video').style.display = 'none';
        }


        estimate_button.addEventListener('click', function(ev){
            processImage();
            ev.preventDefault();
        }, false);

        download_json.addEventListener('click', function(ev){
            downloadJSON();
        }, false);

        download_image.addEventListener('click', function(ev){
            downloadImage();
        }, false);

        emptyImage();
    }

    function downloadJSON() {
        if (localStorage.hasOwnProperty('current_prediction')) {
            var data = localStorage.getItem('current_prediction');
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.parse(JSON.stringify(data)));
            var dlAnchorElem = document.getElementById('downloadAnchorElem');
            dlAnchorElem.setAttribute("href",     dataStr     );
            dlAnchorElem.setAttribute("download", "prediction.json");
            dlAnchorElem.click();
        }
    }

    function downloadImage() {
        if (localStorage.hasOwnProperty('current_canvas')) {
            var data = localStorage.getItem('current_canvas');
            var dlAnchorElem = document.getElementById('downloadAnchorElem');
            dlAnchorElem.setAttribute("href",     data     );
            dlAnchorElem.setAttribute("download", "image.png");
            dlAnchorElem.click();
        }

    }

    function emptyImage() {
        var context = canvas.getContext('2d');
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas.width, canvas.height);

        var data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }

    async function processImage() {

        var context = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        if (document.getElementById('webcamChoice').checked) {
            if (streaming) {
                context.drawImage(video, 0, 0, width, height);
            } else {
                emptyImage();
            }
        } else if (document.getElementById('imageChoice').checked) {
            image_input = document.getElementById('file_input');
            img = document.getElementById('uploaded_image');

            if (image_input.files[0]) {
                img.onload = function() {
                    context.drawImage(img, 0, 0, width, height);
                }
                img.src = URL.createObjectURL(image_input.files[0]);
            } else {
                emptyImage();
            }
        } else if (document.getElementById('urlChoice').checked) {

        }
        console.log(canvas);

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

                context.font = "30px Ubuntu Mono";
                context.fillStyle = "red";
                context.fillText(category + ': ' + score.toFixed(2).toString(), bbox[0], bbox[1] - 15);
            }

        var file = canvas.toDataURL('image/png');
        photo.setAttribute('src', file);
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
