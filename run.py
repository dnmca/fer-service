
import cv2
import numpy as np
import tensorflow as tf

graph = tf.get_default_graph()

from flask import Flask, render_template, jsonify, request
from estimator import EmotionEstimator

app = Flask(__name__)

estimator = EmotionEstimator()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api', methods=['POST'])
def predict():
    blob = request.files['image'].read()
    img = cv2.imdecode(np.fromstring(blob, np.uint8), cv2.IMREAD_COLOR)

    with graph.as_default():
        prediction = estimator.predict(img)

    return jsonify(prediction)


if __name__ == '__main__':
    app.run(debug=True)
