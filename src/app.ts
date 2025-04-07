import { config } from './config';
import { Client, Intents, Message, TextChannel } from 'discord.js';
import { Bot } from './models/Bot';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_VOICE_STATES] });
const bot = new Bot(config.id);

client.on('ready', () => console.log(`${client.user.tag} is Ready !`));

client.on('guildCreate', guild => {
    bot.addServer(guild.id);
    bot.createSbotCategory(guild);
    console.log(`${guild.name} is added to serverlist.`)
});

client.on('guildDelete', guild => {
    bot.deleteServer(guild.id);
    console.log(`${guild.name} is deleted from serverlist.`);
});

client.on('guildMemberRemove', member => bot.deleteUser(member.guild.id, member.user.id));

client.on('channelDelete', channel => {
    if (channel.type !== 'DM') bot.checkSummary(channel.guildId, channel.id)
});

client.on('messageCreate', message => bot.processCommand(message));

client.login(config.token).then(() => bot.initServerList(client.guilds.cache));




// voiceStateUpdate 핸들러
client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member;
    const user = member.user;
    const guild = newState.guild;

    // 음성채널 입장 or 퇴장 여부
    const joined = !oldState.channel && newState.channel;
    const left = oldState.channel && !newState.channel;
    
    await guild.channels.fetch(); // 캐시 누락 방지

    const targetChannel = guild.channels.cache.find(
        (ch) =>
            ch.type === 'GUILD_TEXT' &&
            ch.name === '시간-체크' &&
            ch.parent?.name === '공부-채널'
    ) as TextChannel;
    
    // if (targetChannel) {
    //     await targetChannel.send(`<@${user}> 음성 채널에 입장하여 타이머를 자동으로 시작했습니다!`);
    // } else {
    //     console.error('시간-체크 채널을 찾을 수 없습니다.');
    // }

    // 자동 메시지 생성: start / pause 명령어처럼 처리
    const fakeMessage = {
        content: joined ? 'start' : 'pause',
        author: user,
        member: member,
        guild: guild,
        guildId: guild.id,
        channel: targetChannel,
        client: client,
    } as unknown as Message;

    client.emit('messageCreate', fakeMessage);    
});
