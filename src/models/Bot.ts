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

        const channel = await channelManager.create('봇-안내', { type: 'GUILD_TEXT', parent: category.id, topic: 'SBOT 안내 채널입니다.' });
        await channel.send(guide);
    }

    private async createStudyCategory(guild: Guild) {
        const channelManager = guild.channels;
        const server = this.serverList.get(guild.id);
        console.log("==========================")
        const studyCategory = await channelManager.create('공부-채널', { type: 'GUILD_CATEGORY' });

        const attendChannel = await channelManager.create('출석-체크', { type: 'GUILD_TEXT', parent: studyCategory.id, topic: '나 공부하러 왔다 ~ :wave:' });
        await attendChannel.send('출석체크를 통해 공부의 시작을 알리세요. :sunglasses:');
        attendChannel.permissionOverwrites.create(this.id, { 'VIEW_CHANNEL': false });

        const watchChannel = await channelManager.create('시간-체크', { type: 'GUILD_TEXT', parent: studyCategory.id, topic: '' });
        await watchChannel.send('공부 채널 - `캠-스터디` 입장으로 스톱워치를 시작하세요! \n채널 알림을 꺼두는 것을 추천합니다. :no_bell:');
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
        let comment = `해당 채널에 **하루 정리**가 설정되었습니다.
        목표 시간을 달성하면 😃, 달성하지 못하면 👻 표시`;
        summaryChannel.send(comment);

        await channelManager.create('캠-스터디', { type: 'GUILD_VOICE', parent: studyCategory.id });
    }

    public async processCommand(message: Message) {
        if (message.author.bot) return;

        const content = message.content.toLowerCase();
        const args = content.split(' ');
        const command = args.shift();

        const userId = message.author.id;
        this.knownUsers.add(userId);

        if (args.length > 3) return;

        if (command === 'set') {
            const target = args.shift();
            if (args.length === 2) {
                const hour = parseInt(args.at(0));
                const min = parseInt(args.at(1));

                if (target === 'goaltime') {
                    this.setGoalTime(message, hour, min);
                    return;
                }

                if (target === 'summarytime') {
                    this.setSummaryTime(message, hour, min);
                    return;
                }
            }

        }

        const server = this.serverList.get(message.guildId);
        const channel = message.channel as TextBasedChannel;
        switch (content) {
            case 'init':
                return await this.createStudyCategory(message.guild);
            case 'help':
                message.channel.send(help);
                return;
            case 'summary':
                return this.showTotalSummary(message);
            case 'set summary':
                return this.setSummary(message);
            case 'time':
            case 't':
                return this.showTotalTime(message);
            case 'goal':
            case 'g':
                return this.showGoalHour(message);
        }
    }


    async showTotalSummary(message: Message) {
        const server = this.getServer(message.guildId);
        const channel = message.channel;
        const today = this.getBaseDate();

    // 누적 시간 또는 스톱워치 활성 사용자가 한 명이라도 있는지 확인
    const hasActiveUser = Array.from(server.userList.values()).some(
        (user) => user.totalTimeSeconds > 0 || user.startTime !== null
    );

    if (!hasActiveUser) {
        await channel.send(`**${today} 아직 참여한 사용자가 없습니다**`);
        return;
    }

        const summary: { userId: string; time: number }[] = [];

        server.userList.forEach((user, userId) => {
            const total = user.getTotalTimeSeconds();
            summary.push({ userId, time: total });
        });

        summary.sort((a, b) => b.time - a.time);

        const lines = await Promise.all(summary.map(async ({ userId, time }, index) => {
            const goalInSeconds = (server.goalMinute ?? 0) * 60;
            const emoji = time >= goalInSeconds ? '😃' : '👻';
            return `${index + 1}위 - <@${userId}> ${time > 0 ? this.formatDuration(time) : '0시간'} ${emoji}`;
        }));

        await channel.send(`⏱️ **${today} 누적 시간 순위** ⏱️\n` + lines.join('\n'));
    }

    // 누적 시간 초기화
    private resetUserTimes(server: Server, resetTime: Date) {
        const summary: { userId: string; time: number }[] = [];

        server.userList.forEach((user, userId) => {
            let total = user.getTotalTimeSeconds();

            // 현재까지의 누적 시간 저장
            if (user.startTime) {
                const elapsed = Math.floor((resetTime.getTime() - user.startTime.getTime()) / 1000);
                total += elapsed;

                user.pauseStopwatch();
                user.startStopwatch();  // resetTime 기준으로 스톱워치 재시작
            }
            summary.push({ userId, time: total });

            // 누적 시간 초기화
            user.totalTimeSeconds = 0;
            this.activeTimers.set(userId, { startTime: this.getCurrentTime(), accumulated: 0 });
        });
    }

    // summary 출력 & 시간 초기화
    async resetSummary(message: Message) {
        const server = this.getServer(message.guildId);
        const channel = message.channel;

        const cronParts = server.summary.cron.split(' ');
        const cronMin = parseInt(cronParts[1]);
        const cronHour = parseInt(cronParts[2]);

        const now = new Date();
        const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cronHour, cronMin, 0, 0);
        if (resetTime > now) resetTime.setDate(resetTime.getDate() - 1);
        console.log(`=== ${now} 요약 메시지 전송 & 누적 시간 초기화 수행`);

        // 누적 시간 출력
        await this.showTotalSummary(message);

        // 누적 시간 초기화
        this.resetUserTimes(server, resetTime);
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
            server.setSummary(channel.id, () => this.resetSummary(message));
            let comment = `해당 채널에 **하루 정리**가 설정되었습니다.\n`;
            comment += `목표 시간을 달성하면 😃을 , 달성하지 못한다면 👻을 받습니다.`
            channel.send(comment);
        }
    }

    private setSummaryTime(message: Message, hour: number, min: number) {
        const server = this.serverList.get(message.guildId);
        const channel = message.channel as TextBasedChannel;

        if (hour < 0 || hour > 23 || min < 0 || min > 59) {
            channel.send(`0시 0분부터 23시 59분 사이로 설정해주세요.`);
            return;
        }

        // 아직 summary.job이 없다면 최초 등록
        if (!server.summary.job) {
            server.setSummary(channel.id, () => { this.resetSummary(message) });
            console.log(`=== summaryTime 실행: summaryTime 최초 설정 완료(${hour}:${min})`);
        } else {
            server.editSummaryTime(hour, min);
            console.log(`=== editSummaryTime 실행: summaryTime 수정 완료(${hour}:${min})`);
        }

        channel.send(`**하루 정리**가 ${hour}시 ${min}분을 기준으로 동작합니다.`);
    }

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

    // 사용자별 누적 시간 출력
    private showTotalTime(message: Message) {
        const server = this.serverList.get(message.guildId);
        const channel = message.channel;
        const userId = message.author.id;
        const user = server.getUser(userId);
        
        // 스톱워치를 한 번도 활성화한 적이 없는 경우
        if (!user || (!user.startTime && user.totalTimeSeconds === 0)) {
            channel.send(`<@${userId}> 0시간👻`);
            return;
        }

        let comment = `<@${userId}> ${user.getFormattedTotalTime()} `;
        if (user.startTime) {
            comment += `:book:`;
        } else {
            comment += `:blue_book:`;
        }
        channel.send(comment);
    }

    // private setGoalHour(message: Message, hour: number) {
    //     const server = this.serverList.get(message.guildId);
    //     const channel = message.channel;

    //     if (hour < 0) {
    //         channel.send(`목표 공부시간을 자연수로 입력해주세요.`);
    //     } else {
    //         server.goalHour = hour;
    //         channel.send(`목표 공부시간이 **${hour}시간**으로 변경되었습니다.`);
    //     }
    // }

    private setGoalTime(message: Message, hour: number, minute: number = 0) {
        const server = this.serverList.get(message.guildId);
        const channel = message.channel;

        if (hour < 0 || minute < 0 || minute >= 60) {
            channel.send(`목표 시간을 자연수 시간과 0~59 분 단위로 입력해주세요.`);
            return;
        }

        const goalInMinutes = hour * 60 + minute;
        server.goalMinute = goalInMinutes;

        channel.send(`목표 공부시간이 **${hour}시간 ${minute}분**으로 설정되었습니다.`);
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

    // 음성 채널 입장 시 타이머 시작, 퇴장 시 타이머 정지
    public handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {

        // 입장
        if (!oldState.channel && newState.channel) {
            const server = this.serverList.get(newState.channel.guildId);
            const userId = newState.id;

            if (!server.hasUser(userId)) {
                server.addUser(userId);
            }

            const user = server.getUser(userId);
            if (!user.startTime) {
                user.startStopwatch();
            }
        }

        // 퇴장
        if (oldState.channel && !newState.channel) {
            const server = this.serverList.get(oldState.channel.guildId);
            const userId = oldState.id;

            const user = server.getUser(userId);
            if (server.hasUser(userId) && user.startTime) {
                user.pauseStopwatch();
            }
        }
    }
}