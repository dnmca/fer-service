

(function() {

    var width = 640;
    var height = 0;

    var streaming = false;

    var video = null;
    var canvas = null;
    var photo = null;
    var startbutton = null;

    function startup() {
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        photo = document.getElementById('photo');
        startbutton = document.getElementById('startbutton');

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


        startbutton.addEventListener('click', function(ev){
            processImage();
            ev.preventDefault();
        }, false);

        emptyImage();
    }

    function emptyImage() {
        var context = canvas.getContext('2d');
        context.fillStyle = "#AAA";
        context.fillRect(0, 0, canvas.width, canvas.height);

        var data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }

    async function processImage() {
        var context = canvas.getContext('2d');

        if (streaming) {
          canvas.width = width;
          canvas.height = height;

          context.drawImage(video, 0, 0, width, height);
          let imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

          prediction = makePrediction(imageBlob);

          prediction.then(function(result) {

            for (var face_id in result) {
                bbox = result[face_id]['bbox']
                score = result[face_id]['score']
                category = result[face_id]['category']

                console.log(bbox)
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
          }, function(error) {
            console.error("Error making prediction " + error);
          });

        } else {
          emptyImage();
        }
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
