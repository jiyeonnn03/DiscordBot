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
    public userList: Map<string, User>;
    public useKorean: boolean;
    public summary: { channelId: string; job: schedule.Job; cron: string };

    constructor() {
        this.goalHour = 5;
        this.userList = new Map();
        this.useKorean = false;
        // this.summary = { channelId: null, job: null, cron: '0 0 15 * * *' };
        this.summary = { channelId: null, job: null, cron: '0 0 5 * * *' };
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
        console.log('===setSummary called, cron:', this.summary.cron); // 추가
    }

    private setSummaryTime(hour: number, min: number) {
        // const utcHour = this.kstToUtc(hour);
        // this.summary.cron = `0 ${min} ${utcHour} * * *`;
        this.summary.cron = `0 ${min} ${hour} * * *`;
    }

    public editSummaryTime(hour: number, min: number) {
        this.setSummaryTime(hour, min);
        console.log('===editSummaryTime called, new cron:', this.summary.cron); // 추가
        if (this.summary.job) {
            const res = schedule.rescheduleJob(this.summary.job, this.summary.cron);
            console.log('===rescheduleJob result:', res ? 'success' : 'failure');
        } else {
        console.log('No existing job to reschedule');
    }
    }

    private kstToUtc(hour: number) {
        return (hour + 15) % 24; // 예: 9시 KST → 0시 UTC
    }

    public clearSummary() {
        schedule.cancelJob(this.summary.job);
        this.summary.channelId = null;
        this.summary.job = null;
    }

    // ✅ 유저 고유 키: guildId:userId
    private getUserKey(userId: string, guildId: string): string {
        return `${guildId}:${userId}`;
    }

    // ✅ 시간 포맷
    public formatDuration(ms: number): string {
        const totalSec = Math.floor(ms / 1000);
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        return `${hours}시간 ${minutes}분 ${seconds}초`;
    }
}
