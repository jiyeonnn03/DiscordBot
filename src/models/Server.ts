import schedule from 'node-schedule';
import { User } from './User';

type StopwatchRecord = {
    start?: number;
    total: number;
    username: string;
};

export class Server {
    private stopwatchMap: Map<string, StopwatchRecord> = new Map(); // guildId:userId 기준

    public goalHour: number;
    public goalMinute: number;
    public userList: Map<string, User>;
    public useKorean: boolean;
    public summary: { channelId: string; job: schedule.Job; cron: string };

    constructor() {
        this.goalHour = 5;
        this.goalMinute = 0;
        this.userList = new Map();
        this.useKorean = false;
        this.summary = { channelId: null, job: null, cron: '0 0 5 * * *' }; // 초기화 시간: 오전 5시 설정
    }

    public hasUser(userId: string): boolean {
        return this.userList.has(userId);
    }

    public getUser(userId: string): User {
        return this.userList.get(userId);
    }

    public addUser(userId: string) {
        const user = new User();
        this.userList.set(userId, user);
    }

    public deleteUser(userId: string) {
        this.userList.delete(userId);
    }

    public setSummary(channelId: string, summary: schedule.JobCallback) {
        this.summary.channelId = channelId;
        this.summary.job = schedule.scheduleJob(this.summary.cron, summary);
        console.log(`server.ts===setSummary called - cron: ${this.summary.cron}`); // 추가
    }

    private setSummaryTime(hour: number, min: number) {
        // const utcHour = this.kstToUtc(hour);
        // this.summary.cron = `0 ${min} ${utcHour} * * *`;
        this.summary.cron = `0 ${min} ${hour} * * *`;
    }

    public editSummaryTime(hour: number, min: number) {
        this.setSummaryTime(hour, min);
        console.log(`server.ts===editSummaryTime called - cron: ${this.summary.cron}`); // 추가
        if (this.summary.job) {
            const res = schedule.rescheduleJob(this.summary.job, this.summary.cron);
            console.log(`server.ts===rescheduleJob result: ${res ? 'success' : 'failure'}`);
        } else {
            console.log('server.ts===No existing job to reschedule');
        }
    }

    public clearSummary() {
        schedule.cancelJob(this.summary.job);
        this.summary.channelId = null;
        this.summary.job = null;
    }
}
