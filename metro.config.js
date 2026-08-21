// استبعاد ملفات AppleDouble (._*) التي يولّدها نظام الملفات exFAT —
// كانت تكسر Metro أثناء الحزم. (blockList يقبل RegExp مباشرة)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [/\._.*/, /\/\.expo\//];
module.exports = config;
