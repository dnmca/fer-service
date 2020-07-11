
import cv2
import pathlib
import numpy as np

from keras.models import model_from_json


PROJECT_ROOT = pathlib.Path(__file__).parent

MODEL_JSON = PROJECT_ROOT / 'resources' / 'augmented-baseline.json'
MODEL_WEIGHTS = PROJECT_ROOT / 'resources' / 'augmented-baseline.h5'

MAPPING = {
    0: 'Angry',
    1: 'Disgust',
    2: 'Fear',
    3: 'Happy',
    4: 'Sad',
    5: 'Surprise',
    6: 'Neutral'
}


class EmotionEstimator:

    def __init__(self):

        with open(str(MODEL_JSON), 'r') as file:
            self.model = model_from_json(file.read())

        self.model.load_weights(str(MODEL_WEIGHTS))

        self.haar = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

        self.input_w = 48
        self.input_h = 48

    def detect_faces(self, image):

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        detections = self.haar.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)
        output = {}

        for bbox in detections:
            x, y, w, h = bbox

            x0, y0 = x, y
            x1, y1 = x + w, y + h

            crop = gray[y0:y1, x0:x1]
            h, w = crop.shape

            if h * w > 0:
                face_id = len(output)
                output[face_id] = {'bbox': [x0, y0, x1, y1], 'crop': crop}

        return output

    def predict(self, image):

        faces = self.detect_faces(image)

        results = {}

        print(faces)

        for face_id, data in faces.items():
            img = data['crop']
            img = cv2.resize(img, (self.input_w, self.input_h), interpolation=cv2.INTER_AREA)
            img = img / 255
            img = img.reshape((1, self.input_w, self.input_h, 1))

            print(img.shape)

            out = self.model.predict(img)

            category = MAPPING[np.argmax(out)]
            score = out[0][np.argmax(out)]

            results[face_id] = {
                'bbox': [int(x) for x in data['bbox']],
                'category': category,
                'score': float(score)
            }

        return results

    def visualize(self, img, predictions, target_dir='.'):

        target_img = pathlib.Path(target_dir) / 'result.png'

        for face_id, pred in predictions.items():
            x0, y0, x1, y1 = pred['bbox']
            category = pred['category']
            score = pred['score']

            cv2.rectangle(img, (x0, y0), (x1, y1), color=(0, 255, 0), thickness=2)
            cv2.putText(img, text='{}: {:.2f}'.format(category, score),
                        org=(x0 + 5, y0 - 10),
                        fontFace=cv2.FONT_HERSHEY_PLAIN, fontScale=1,
                        color=(0, 255, 0), thickness=2)
        cv2.imwrite(str(target_img), img)
