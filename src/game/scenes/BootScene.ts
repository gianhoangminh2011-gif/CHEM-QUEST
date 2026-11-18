import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        key: 'BootScene'
    }

    preload() {
        // Load các tài nguyên game của bạn ở đây...
    }

    create() {
        // 1. Chặn trình duyệt cuộn trang khi bấm phím mũi tên hoặc WASD trên laptop
        if (this.input.keyboard) {
            this.input.keyboard.addCapture('UP, DOWN, LEFT, RIGHT, W, A, S, D');
        }

        // 2. Ép canvas luôn nhận focus khi người dùng click chuột/chạm touchpad trên laptop
        this.input.on('pointerdown', () => {
            if (this.game.canvas) {
                this.game.canvas.focus();
            }
        });

        // Tự động focus ngay khi Scene được tạo
        if (this.game.canvas) {
            this.game.canvas.focus();
        }

        // 3. Chống kẹt phím (key sticking) khi người dùng Alt+Tab ra ngoài màn hình
        window.addEventListener('blur', () => {
            // Gửi sự kiện hoặc reset trạng thái bàn phím toàn cục nếu cần
            if (this.input.keyboard) {
                this.input.keyboard.resetKeys();
            }
        });

        // Chuyển sang Scene tiếp theo (ví dụ: GameScene)
        this.scene.start('GameScene');
    }
}
