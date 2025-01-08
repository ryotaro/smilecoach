const video = document.getElementById('video');
const outputCanvas = document.getElementById('outputCanvas');
const faceCanvas = document.getElementById('faceCanvas');
const ctx = outputCanvas.getContext('2d');
const faceCtx = faceCanvas.getContext('2d');
const happinessScoreElement = document.getElementById('happinessScore');

let animationId = null;
let detecting = false;
let lastTime = 0; // 最後に処理を実行した時間を記録

const alpha = 0.1; // 平滑化の強度
let smoothedScore = 0; // 平滑化されたスコア

async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models'); // 顔検出モデル
    await faceapi.nets.faceExpressionNet.loadFromUri('./models'); // 感情分析モデル
}

async function startVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    return new Promise(resolve => {
        video.addEventListener('loadeddata', resolve, { once: true });
    });
}

document.getElementById('startButton').addEventListener('click', async () => {
    if (!detecting) {
        detecting = true;
        document.getElementById('startButton').disabled = true;
        document.getElementById('stopButton').disabled = false;

        await loadModels();
        await startVideo();
        detectEmotion();
    }
});

document.getElementById('stopButton').addEventListener('click', () => {
    detecting = false;
    document.getElementById('startButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});

async function detectEmotion() {
    if (!detecting) return;

    const now = performance.now();
    const fpsInterval = 1000 / 30; // 30FPS
    if (now - lastTime >= fpsInterval) {
        lastTime = now;

        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();

        if (detections) {
            const happinessScore = detections.expressions.happy;

            // Exponential Moving Average (EMA)で平滑化
            smoothedScore = alpha * happinessScore + (1 - alpha) * smoothedScore;

            // スコアに応じた明度を計算 (20%〜90%)
            const lightness = 20 + smoothedScore * 70; // 明度は20%から90%まで変化

            // 背景色を設定 (ピンク色: hsl(330, 100%, lightness%))
            document.body.style.backgroundColor = `hsl(330, 100%, ${lightness}%)`;

            // スコアをUIに表示
            happinessScoreElement.textContent = `Score: ${(smoothedScore * 100).toFixed(2)}%`;

            // 顔の描画
            const { x, y, width, height } = detections.detection.box;
            faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
            faceCtx.drawImage(video, x, y, width, height, 0, 0, faceCanvas.width, faceCanvas.height);
        } else {
            happinessScoreElement.textContent = 'Score: --';
        }
    }

    animationId = requestAnimationFrame(detectEmotion);
}
