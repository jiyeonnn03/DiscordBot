import { Guild, Message, TextBasedChannel } from 'discord.js';
import { Server } from './Server';
import { help, guide } from '../info';
import { VoiceState } from 'discord.js';

interface Timer {
    startTime: number;
    accumulated: number;
  }
  
  interface UserTimeRecord {
    [date: string]: number; // yyyy-MM-dd
  }
  
  export class Bot {
    private id: string;
    private serverList: Map<string, Server>;
    private activeTimers: Map<string, Timer> = new Map();
    private accumulatedTimes: Map<string, UserTimeRecord> = new Map();
    private knownUsers: Set<string> = new Set();
  
    constructor(id: string) {
      this.serverList = new Map();
      this.id = id;
    }
  
    public initServerList(guilds: Map<string, Guild>) {
      guilds.forEach(guild => {
        const server = new Server();
        this.serverList.set(guild.id, server);
      });
      console.log('Building Server List ...');
    }
  
    public getServer(guildId: string): Server {
      if (!this.serverList.has(guildId)) {
        this.serverList.set(guildId, new Server());
      }
      return this.serverList.get(guildId)!;
    }
  

    public addServer(guildId: string) {
        const server = new Server();
        this.serverList.set(guildId, server);
    }

    public deleteServer(guildId: string) {
        this.serverList.get(guildId).clearSummary();
        this.serverList.delete(guildId);
    }
    
    public deleteUser(guildId: string, userId: string) {
        const server = this.serverList.get(guildId);
        server.deleteUser(userId);
    }

    public checkSummary(guildId: string, channelId: string) {
        const server = this.serverList.get(guildId);
        if (channelId === server.summary.channelId) {
            server.clearSummary();
        }
    }

    public async createSbotCategory(guild: Guild) {
        const channelManager = guild.channels;

        const category = await channelManager.create('SBOT', {
            type: 'GUILD_CATEGORY', 
            permissionOverwrites: [
                { 
                    id: guild.roles.everyone,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: this.id,
                    allow: ['VIEW_CHANNEL']
                }
            ]
        });

        const channel = await channelManager.create('봇-안내', { type: 'GUILD_TEXT', parent:category.    id, topic: 'SBOT 안내 채널입니다.'});
        await channel.send(guide);
    }

    private async createStudyCategory(guild: Guild) {
        const channelManager = guild.channels;
        const server = this.serverList.get(guild.id);
        console.log("==========================")
        const studyCategory = await channelManager.create('공부-채널', { type: 'GUILD_CATEGORY'});

        const attendChannel = await channelManager.create('출석-체크', { type: 'GUILD_TEXT', parent: studyCategory.id, topic: '나 공부하러 왔다 ~ :wave:'});
        await attendChannel.send('출석체크를 통해 공부의 시작을 알리세요. :sunglasses:');
        attendChannel.permissionOverwrites.create(this.id, {'VIEW_CHANNEL': false});

        const watchChannel = await channelManager.create('시간-체크', { type: 'GUILD_TEXT', parent: studyCategory.id, topic: ''});
        await watchChannel.send('공부 채널 - `캠-스터디` 입장으로 스톱워치를 시작하세요! \n채널 알림을 꺼두는 것을 추천합니다. :no_bell:');
        // await watchChannel.send('`start` 로 스톱워치를 시작하세요! `help` 를 통해 사용가능한 명령어를 확인할 수 있습니다.\n채널 알림을 꺼두는 것을 추천합니다. :no_bell:');
        await watchChannel.send(help);

        const summaryChannel = await channelManager.create('하루-정리', { 
            type: 'GUILD_TEXT', 
            parent: studyCategory.id, 
            topic: '오늘 😃을 받을까, 👻을 받을까?', 
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ['SEND_MESSAGES']
                },
                {
                    id: this.id,
                    allow: ['SEND_MESSAGES']
                }
            ]
        });
        if (server.summary.job || server.summary.channelId) server.clearSummary();
        // server.setSummary(summaryChannel.id, () => {this.summary(server, summaryChannel)});
        let comment = `해당 채널에 **하루 정리**가 설정되었습니다.
        목표 시간을 달성하면 😃을 , 달성하지 못한다면 👻을 받습니다.`;
        summaryChannel.send(comment);
        
        await channelManager.create('캠-스터디', { type: 'GUILD_VOICE', parent: studyCategory.id });
        
        // const etcCategory = await channelManager.create('사담-채널', { type: 'GUILD_CATEGORY'});

        // const talkChannel = await channelManager.create('수다는-적당히', { type: 'GUILD_TEXT', parent: etcCategory.id, topic: ':speaking_head:'});
        // await talkChannel.send('자유롭게 이야기할 수 있는 공간입니다.');

        // const trashChannel = await channelManager.create('감정-쓰레기통', { type: 'GUILD_TEXT', parent: etcCategory.id, topic: ':wastebasket:'});
        // await trashChannel.send('스트레스를 쏟아붓는 곳입니다. 자유롭게 사용하기 위해 채널 알림을 꺼주세요! :no_bell:');

        // await etcCategory.permissionOverwrites.create(this.id, {'VIEW_CHANNEL': false});
    }
  
    public async processCommand(message: Message) {
        if (message.author.bot) return;
    
        const content = message.content.toLowerCase();
        const args = content.split(' ');
        const command = args.shift();
    
        const userId = message.author.id;
        this.knownUsers.add(userId);
    
        // const channel = message.channel as TextBasedChannel;
        // const server = this.serverList.get(message.guildId!);
  
        if (args.length > 3) return;
    
        if (command === 'set') {
            const target = args.shift();
    
            if (args.length === 1 && target === 'goalhour' ) {
                const hour = parseInt(args.at(0));
                this.setGoalHour(message, hour);
                return;
            }
    
            if (args.length === 2 && target === 'summarytime') {
                const hour = parseInt(args.at(0));
                const min = parseInt(args.at(1));
                this.setSummaryTime(message, hour, min);
                return;
            }
        }
        
        const server = this.serverList.get(message.guildId);
        const channel = message.channel as TextBasedChannel;
        switch (content) {
            case 'start':
                if (this.activeTimers.has(userId)) {
                  message.reply('이미 타이머가 작동 중입니다.');
                  return;
                }
                this.activeTimers.set(userId, { startTime: this.getCurrentTime(), accumulated: 0 });
                message.reply('타이머를 시작했어요.');
                break;
        
              case 'stop': {
                const timer = this.activeTimers.get(userId);
                if (!timer) {
                  message.reply('타이머가 작동 중이 아닙니다.');
                  return;
                }
                const now = this.getCurrentTime();
                const elapsed = Math.floor((now - timer.startTime) / 1000);
                const today = this.getBaseDate();
        
                const userRecord = this.accumulatedTimes.get(userId) || {};
                userRecord[today] = (userRecord[today] || 0) + elapsed;
                this.accumulatedTimes.set(userId, userRecord);
        
                this.activeTimers.delete(userId);
                message.reply(`타이머를 중지했어요. 총 누적 시간: ${this.formatDuration(userRecord[today])}`);
                break;
              }
        
              case 'summary': {
                // this.summaryCallback(message);
                // break;
                const today = this.getBaseDate();
                const summary = Array.from(this.knownUsers).map(userId => {
                  const time = this.getUserTime(userId);
                  return { userId, time };
                });
        
                summary.sort((a, b) => b.time - a.time);
        
                const lines = await Promise.all(summary.map(async ({ userId, time }, index) => {
                  const user = await message.client.users.fetch(userId);
                  const name = userId;
                  return `${index + 1}위 - <@${name}> ${time > 0 ? this.formatDuration(time) : '0시간👻'}`;
                }));
        
                channel.send(`⏱️ **${today} 누적 시간 순위** ⏱️\n` + lines.join('\n'));
                break;
              }
        
              case 'time': {
                const time = this.getUserTime(userId);
                message.reply(`현재까지 누적 시간: ${this.formatDuration(time)}`);
                break;
              }

            case 'set summary':
                return this.setSummary(message);
            case 'clear summary':
                return this.clearSummary(message);
            // case 'summary':
            //     return this.summary(server, channel);
            // case 'set korean':
            //     return this.setKorean(message);
            // case 'clear korean':
            //     return this.clearKorean(message);
            case 'init':
                return await this.createStudyCategory(message.guild);
            case 'help':
                message.channel.send(help);
                return;
            // case 'start':
            case 's':
                return this.startStopwatch(message);
            case 'pause':
            case 'p':
                return this.pauseStopwatch(message);
            // case 'time':
            case 't':
                return this.showTotalTime(message);
            case 'goal':
            case 'g':
                return this.showGoalHour(message);
            case 'console server':
                return console.log(this.serverList.get(message.guildId));
            case 'console serverlist':
                return console.log(this.serverList);
            case 'console channels':
                message.guild.channels.cache.forEach(channel => {
                    console.log(channel);
                });
                return;
        }
    }

    private setGoalHour(message: Message, hour: number) {
        const server = this.serverList.get(message.guildId);
        const channel = message.channel;

        if (hour < 0) {
            channel.send(`목표 공부시간을 자연수로 입력해주세요.`);
        } else {
            server.goalHour = hour;
            channel.send(`목표 공부시간이 **${hour}시간**으로 변경되었습니다.`);
        }
    }

    // private setSummaryTime(message: Message, hour: number, min: number) {
    //     const server = this.serverList.get(message.guildId);
    //     const channel = message.channel;

    //     if (hour < 0 || hour > 23 || min < 0 || min > 59) {
    //         channel.send(`0시 0분부터 23시 59분 사이로 설정해주세요.`);
    //     } else {
    //         server.editSummaryTime(hour, min);
    //         channel.send(`**하루 정리**가 ${hour}시 ${min}분을 기준으로 동작합니다.`);
    //     }
    // }
    private setSummaryTime(message: Message, hour: number, min: number) {
        const server = this.serverList.get(message.guildId);
        const channel = message.channel as TextBasedChannel;

        if (hour < 0 || hour > 23 || min < 0 || min > 59) {
            channel.send(`0시 0분부터 23시 59분 사이로 설정해주세요.`);
            return;
        }

        // ✅ 아직 summary.job이 없다면, 최초 등록
        if (!server.summary.job) {
            server.setSummary(channel.id, () => {this.summary(message)});
            console.log(`=== summaryTime 최초 등록 완료`);
        } else {
            server.editSummaryTime(hour, min);
            console.log(`=== editSummaryTime 스케줄 등록 완료`);
        }

        channel.send(`**하루 정리**가 ${hour}시 ${min}분을 기준으로 동작합니다.`);
    }

    private setSummary(message: Message) {
        const server = this.serverList.get(message.guildId);
        const channel = message.channel;


        if (server.summary.job || server.summary.channelId) {
            if (channel.id === server.summary.channelId) {
                channel.send(`이미 **하루 정리**가 설정된 채널입니다.`);
            } else {
                channel.send(`**하루 정리**가 설정된 다른 채널이 있습니다.`);
            }
        } else {
            // const cronParts = server.summary.cron.split(' ');
            // // cron 형식: '0 분 시 * * *'
            // const resetTime = new Date(parseInt(cronParts[2]), parseInt(cronParts[1]), 0, 0);
            // const now = new Date();

            // // 현재 시간보다 초기화 시간이 미래면 하루 전으로 보정 (예: 14:00 cron인데 현재가 13:00인 경우)
            // if (now < resetTime) {
            //     resetTime.setUTCDate(resetTime.getUTCDate() - 1);
            // }

            // const fakeMessage = {
            //     channel,
            //     author: { id: 'system' },       // 봇이나 시스템 ID로 처리
            //     guildId: message.guildId,
            //     client: message.client,
            //     content: 'summary',
            //     isAuto: true,
            //     summarytime: resetTime.getTime()
            // } as Message & { isAuto: boolean; summarytime: number };

            // console.log('===> channel.id', channel.id, 'channel', channel)
            // // server.setSummary(channel.id, () => {this.summary(server, channel)});
            // server.setSummary(channel.id, () => this.summaryCallback(fakeMessage));

            // server.setSummary(channel.id, () => {this.summary(server, channel)});
            server.setSummary(channel.id, () => this.summary(message));
            let comment = `해당 채널에 **하루 정리**가 설정되었습니다.\n`;
            comment += `목표 시간을 달성하면 😃을 , 달성하지 못한다면 👻을 받습니다.`
            channel.send(comment);
        }
    }

    // isAuto 추가한 코드(잘 안됨)
    // private setSummary(message: Message) {
    //     const server = this.serverList.get(message.guildId);
    //     const channel = message.channel;


    //     if (server.summary.job || server.summary.channelId) {
    //         if (channel.id === server.summary.channelId) {
    //             channel.send(`이미 **하루 정리**가 설정된 채널입니다.`);
    //         } else {
    //             channel.send(`**하루 정리**가 설정된 다른 채널이 있습니다.`);
    //         }
    //     } else {
    //         const cronParts = server.summary.cron.split(' ');
    //         // cron 형식: '0 분 시 * * *'
    //         const resetTime = new Date(parseInt(cronParts[2]), parseInt(cronParts[1]), 0, 0);
    //         const now = new Date();

    //         // 현재 시간보다 초기화 시간이 미래면 하루 전으로 보정 (예: 14:00 cron인데 현재가 13:00인 경우)
    //         if (now < resetTime) {
    //             resetTime.setUTCDate(resetTime.getUTCDate() - 1);
    //         }

    //         const fakeMessage = {
    //             channel,
    //             author: { id: 'system' },       // 봇이나 시스템 ID로 처리
    //             guildId: message.guildId,
    //             client: message.client,
    //             content: 'summary',
    //             isAuto: true,
    //             summarytime: resetTime.getTime()
    //         } as Message & { isAuto: boolean; summarytime: number };

    //         console.log('===> channel.id', channel.id, 'channel', channel, 'fake_mes', fakeMessage)
    //         // server.setSummary(channel.id, () => {this.summary(server, channel)});
    //         server.setSummary(channel.id, () => this.summaryCallback(fakeMessage));
    //         let comment = `해당 채널에 **하루 정리**가 설정되었습니다.\n`;
    //         comment += `목표 시간을 달성하면 😃을 , 달성하지 못한다면 👻을 받습니다.`
    //         channel.send(comment);
    //     }
    // }

    // async summaryCallback(channel: TextBasedChannel) {
    //     console.log('===summaryCallback 실행')
    //     const today = this.getBaseDate();
    //     console.log('knownusers: ', this.knownUsers)

    //     const summary = Array.from(this.knownUsers).map(userId => {
    //         const time = this.getUserTime(userId);
    //         return { userId, time };
    //     });
        
    //     summary.sort((a, b) => b.time - a.time);
        
    //     const lines = await Promise.all(summary.map(async ({ userId, time }, index) => {
    //         const user = await channel.client.users.fetch(userId);
    //         return `${index + 1}위 - <@${userId}> ${time > 0 ? this.formatDuration(time) : '0시간 (비활성)'}`;
    //     }));

    //     channel.send(`⏱️ **${today} 누적 시간 순위** ⏱️\n` + lines.join('\n'));
    //     }

// // summaryCallback 함수
// async summaryCallback(message: Message) {
//     console.log('===summaryCallback 실행');
//     const today = this.getBaseDate();

//     const knownUsers = this.knownUsers; // Set<string>
//     console.log('knownUsers:', knownUsers);

//     const summary = Array.from(knownUsers).map(userId => {
//         const time = this.getUserTime(userId);
//         return { userId, time };
//     });

//     summary.sort((a, b) => b.time - a.time);

//     const lines = await Promise.all(summary.map(async ({ userId, time }, index) => {
//     const user = await message.client.users.fetch(userId);

//     const resetTime = new Date().getTime();

//     // 스톱워치가 작동 중이면 현재까지의 시간 누적
//     const timer = this.activeTimers.get(userId);
//     console.log('resetTime: ', resetTime, 'timer: ', timer)
//     if (timer) {
//         const elapsed = Math.floor((resetTime - timer.startTime) / 1000);
//         const userRecord = this.accumulatedTimes.get(userId) || {};
//         userRecord[today] = (userRecord[today] || 0) + elapsed;
//         this.accumulatedTimes.set(userId, userRecord);

//         // 누적 시간 초기화
//         this.accumulatedTimes.set(userId, {});

//         // 타이머 재시작
//         this.activeTimers.set(userId, {
//             startTime: resetTime,
//             accumulated: 0,
//         });

//         console.log(`User ${userId} 자동 초기화: ${elapsed}초 반영 후 재시작`);
//     } else {
//         // 스톱워치가 꺼져 있는 사용자도 누적 시간만 초기화
//         this.accumulatedTimes.set(userId, {});
//     }

//     return `${index + 1}위 - <@${userId}> ${time > 0 ? this.formatDuration(time) : '0시간👻'}`;
//     }));

//     await message.channel.send(`⏱️ **${today} 누적 시간 순위** ⏱️\n` + lines.join('\n'));
// }

async summary(message: Message) {
    console.log("Bot.ts에서 summary 함수 실행")
    const server = this.getServer(message.guildId);
    const channel = message.channel;

    const cronParts = server.summary.cron.split(' ');
    const cronMin = parseInt(cronParts[1]);
    const cronHour = parseInt(cronParts[2]);

    const now = new Date();
    const resetTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        cronHour,
        cronMin,
        0,
        0
    );

    if (resetTime > now) {
        resetTime.setDate(resetTime.getDate() - 1);
    }

    const today = this.getBaseDate();

    if (this.knownUsers.size === 0) {
        await channel.send(`⏱️ **${today} 누적 시간 순위** ⏱️\n- 아직 참여한 사용자가 없습니다 -`);
        return;
    }

    const summary: { userId: string; time: number }[] = [];

    server.userList.forEach((user, userId) => {
        let total = user.getTotalTime(today);

        // 스톱워치가 작동 중이면 resetTime까지의 시간 누적 후 재시작
        if (user.startTime) {
        const elapsed = Math.floor((resetTime.getTime() - user.startTime.getTime()) / 1000);
        total += elapsed;

        user.pauseStopwatch();
        user.startTime = resetTime;  // 재시작 시점을 초기화 시간 기준으로 설정

        console.log(`User ${userId} 스톱워치 재시작됨. 누적시간: ${total}초`);
        }

        summary.push({ userId, time: total });

        // 누적 시간 초기화
        // user.time = 0;
        this.activeTimers.set(userId, { startTime: this.getCurrentTime(), accumulated: 0 });
    });

    // 누적 시간 순 정렬
    summary.sort((a, b) => b.time - a.time);

    // 포맷팅 및 출력
    const lines = await Promise.all(summary.map(async ({ userId, time }, index) => {
        const userObj = await message.client.users.fetch(userId);
        return `${index + 1}위 - <@${userId}> ${time > 0 ? this.formatDuration(time) : '0시간 (비활성)'}`;
    }));

    await channel.send(`⏱️ **${today} 누적 시간 순위** ⏱️\n` + lines.join('\n'));
    }



    // private summary(server: Server, channel: TextBasedChannel) {
    //     const now = new Date();
    //     const week = ['일','월','화','수','목','금','토'];
    //     let comment = `:mega:  ${now.getMonth() + 1}월 ${now.getDate()}일 ${week[now.getDay()]}요일 \n`;
    
    //     if (server.userList.size === 0) {
    //         comment += `- 아직 참여한 사용자가 없습니다 -`;
    //     } else {
    //         server.userList.forEach((user, userId) => {
    //             // 일시 정지
    //             if (user.startTime) {
    //                 user.pauseStopwatch();
    //                 user.startTime = now; // 다시 시작
    //             }
    
    //             // 오늘 날짜 키
    //             const todayKey = now.toISOString().slice(0, 10); // 혹은 user.getTodayKey() 쓰도록 변경
    //             const totalSeconds = user.getTotalTime(todayKey);
    //             const totalDate = new Date(totalSeconds * 1000); // Date로 변환
    
    //             comment += `<@${userId}> ${totalDate.getUTCHours()}시간 ${totalDate.getUTCMinutes()}분 ${totalDate.getUTCSeconds()}초 `;
    
    //             if (totalDate.getUTCHours() >= server.goalHour) {
    //                 comment += `:thumbsup:\n`;
    //             } else {
    //                 comment += `:bricks:\n`;
    //             }
    //         });
    //     }
    
    //     channel.send(comment);
    // }
    

    private clearSummary(message: Message) {
        const server = this.serverList.get(message.guildId);
        const channel = message.channel;

        if (server.summary.channelId && server.summary.job) {
            if (channel.id === server.summary.channelId) {
                server.clearSummary();
                channel.send(`**하루 정리**가 해제되었습니다.`);
            } else {
                channel.send(`**하루 정리**를 설정한 채널에서 해제해주세요.`);
            }
        } else {
            channel.send(`**하루 정리**가 설정된 채널이 없습니다.`);
        }
    }

    private startStopwatch(message: Message) {
        // const server = this.serverList.get(message.guildId);
        const server = this.getServer(message.guildId);
        const channel = message.channel;
        const userId = message.author.id;

        if (!server.hasUser(userId)) {
            server.addUser(userId);
            channel.send(`<@${userId}> 새로운 스터디원을 환영합니다!  :partying_face:`);
        }

        const user = server.getUser(userId);
        if (!user.startTime) {
            user.startStopwatch();
            channel.send(`<@${userId}> 스톱워치 시작`);
        }
    }
    
    private pauseStopwatch(message: Message) {
        // const server = this.serverList.get(message.guildId);
        const server = this.getServer(message.guildId);
        const channel = message.channel;
        const userId = message.author.id;

        const user = server.getUser(userId);
        if (server.hasUser(userId) && user.startTime) {
            user.pauseStopwatch();
            channel.send(`<@${userId}> 스톱워치 멈춤`);
        }
    }

    private showTotalTime(message: Message) {
        const server = this.serverList.get(message.guildId);
        // const server = this.getServer(message.guildId);
        const channel = message.channel;
        const userId = message.author.id;

        const user = server.getUser(userId);
        if (!user || !user.startTime) {
            channel.send(`<@${userId}> 스톱워치를 먼저 시작해주세요.`);
            return;
        }

        const totalTime = user.getCurrentTotal();
        let comment = `<@${userId}> 오늘 하루  **${totalTime.getHours()}시간 ${totalTime.getMinutes()}분 ${totalTime.getSeconds()}초** `;
        if (user.startTime) {
            comment += `공부중  :book:`;
        } else {
            comment += `공부  :blue_book:`;
        }
        channel.send(comment);
    }

    private showGoalHour(message: Message) {
        const server = this.serverList.get(message.guildId);
        const channel = message.channel;
        channel.send(`목표 공부시간은 **${server.goalHour}시간**입니다.`);
    }

    private getCurrentTime(): number {
        return Date.now();
    }
    
    private getBaseDate(): string {
    const now = new Date();
    const offset = 1000 * 60 * 60 * 5;
    const adjusted = new Date(now.getTime() - offset);
    return adjusted.toISOString().split('T')[0];
    }

    private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}시간 ${m}분 ${s}초`;
    }

    private getUserTime(userId: string): number {
    const today = this.getBaseDate();
    const record = this.accumulatedTimes.get(userId) || {};
    let total = record[today] || 0;

    const timer = this.activeTimers.get(userId);
    if (timer) {
        const now = this.getCurrentTime();
        total += Math.floor((now - timer.startTime) / 1000);
    }

    return total;
    }

    // 음성 채널 입장 시 타이머 시작, 퇴장 시 타이머 정지
  public handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const userId = newState.id;

    // 입장
    if (!oldState.channel && newState.channel) {
      if (!this.activeTimers.has(userId)) {
        this.activeTimers.set(userId, { startTime: this.getCurrentTime(), accumulated: 0 });
      }
    }

    // 퇴장
    if (oldState.channel && !newState.channel) {
      const timer = this.activeTimers.get(userId);
      if (timer) {
        const now = this.getCurrentTime();
        const elapsed = Math.floor((now - timer.startTime) / 1000);
        const today = this.getBaseDate();

        const userRecord = this.accumulatedTimes.get(userId) || {};
        userRecord[today] = (userRecord[today] || 0) + elapsed;
        this.accumulatedTimes.set(userId, userRecord);

        this.activeTimers.delete(userId);
      }
    }
  }
}