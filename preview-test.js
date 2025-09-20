const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont, loadImage } = require('canvas');

// Require the bot file to get functions
const bot = require('./botwelcom.js');

(async () => {
    // Create a minimal mock member object similar to Discord's
    const mockMember = {
        id: '123456',
        displayName: 'LucasG_Dev',
        nickname: null,
        guild: {
            id: 'guild123',
            memberCount: 42,
            name: 'TestGuild',
            channels: { cache: new Map() }
        },
        user: {
            id: '123456',
            username: 'LucasG_Dev',
            avatar: null,
            displayAvatarURL: ({ format, size, dynamic } = {}) => {
                // return a local placeholder path for testing
                return path.join(__dirname, 'backgrounds', 'default_avatar.png');
            }
        }
    };

    try {
        const buffer = await bot.generateBannerFast(mockMember, 'BOAS-VINDAS [username]!', true);
        fs.writeFileSync(path.join(__dirname, 'preview-output.png'), buffer);
        console.log('Preview written to preview-output.png');
    } catch (e) {
        console.error('Error generating preview:', e);
    }
})();