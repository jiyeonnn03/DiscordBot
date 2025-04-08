import { Client, Intents, Message } from 'discord.js';
import { Bot } from './models/Bot';
import dotenv from 'dotenv';

dotenv.config(); // Load .env

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const BOT_ID = process.env.BOT_ID!;

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

const bot = new Bot(BOT_ID);

// 봇 준비 완료
client.on('ready', () => {
  console.log(`${client.user?.tag} is Ready!`);
});

// 서버 추가 시 초기화
client.on('guildCreate', guild => {
  bot.addServer(guild.id);
  bot.createSbotCategory(guild);
  console.log(`${guild.name} is added to server list.`);
});

// 서버에서 제거 시 정리
client.on('guildDelete', guild => {
  bot.deleteServer(guild.id);
  console.log(`${guild.name} is deleted from server list.`);
});

// 유저 탈퇴 시 데이터 제거
client.on('guildMemberRemove', member => {
  bot.deleteUser(member.guild.id, member.user.id);
});

// 채널 삭제 시 요약 채널 체크
client.on('channelDelete', channel => {
  if (channel.type !== 'DM') {
    bot.checkSummary(channel.guildId, channel.id);
  }
});

// 메시지 명령 처리
client.on('messageCreate', message => {
  bot.processCommand(message);
});

// 음성 채널 입/퇴장 이벤트 처리
client.on('voiceStateUpdate', async (oldState, newState) => {
  bot.handleVoiceStateUpdate(oldState, newState);
});

// 봇 로그인 및 서버 초기화
client.login(BOT_TOKEN).then(() => {
  bot.initServerList(client.guilds.cache);
});
