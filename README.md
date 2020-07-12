# Facial Expression Recognition service

To run this service on your local machine:

```
pip3 install -r requirements.txt
```

```
python run.py
```

Go to `127.0.0.1:5000` and allow access to your web camera.

There are 3 modes of input: 

* Web-camera input
* Image upload input
* Image URL input 

Due to [this](https://stackoverflow.com/questions/20424279/canvas-todataurl-securityerror) issue, Image URL input type 
is not fully functional, so you cannot estimate emotions on arbitrary images. But you can try it using local image URL: 
`http://127.0.0.1:5000/static/image/test.jpg`


All input images are being rescaled to fit into `640 x 480` input area bounding box.


You can download resulting (rescaled) image and annotations using buttons `Save image` and `Save JSON`