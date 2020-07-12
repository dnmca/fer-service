import cv2
import numpy as np
import tensorflow as tf

from flask import Flask, render_template, jsonify, request
from estimator import EmotionEstimator

app = Flask(__name__)

graph = tf.get_default_graph()
estimator = EmotionEstimator()


@app.route('/')
def index():
    """
    Renders root page of the service
    :return:
    """
    return render_template('index.html')


@app.route('/api', methods=['POST'])
def predict():
    """
    Implements REST API that provides emotions recognition service for given input image.
    Returns json with following schema:

    {0: {
            'bbox': [a, b, w, h],
            'category' category,
            'score', confidence,
        },
     1: {
        ...
        },
     ...
    }

    :return:
    """
    blob = request.files['image'].read()
    img = cv2.imdecode(np.fromstring(blob, np.uint8), cv2.IMREAD_COLOR)

    with graph.as_default():
        prediction = estimator.predict(img)

    return jsonify(prediction)


if __name__ == '__main__':
    app.run(debug=True)
