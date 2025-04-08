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
        this.goalHour = 6;
        this.userList = new Map();
        this.useKorean = false;
        this.summary = { channelId: null, job: null, cron: '0 0 15 * * *' };
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
    }

    private setSummaryTime(hour: number, min: number) {
        const utcHour = this.kstToUtc(hour);
        this.summary.cron = `0 ${min} ${utcHour} * * *`;
    }

    public editSummaryTime(hour: number, min: number) {
        this.setSummaryTime(hour, min);
        if (this.summary.job) {
            schedule.rescheduleJob(this.summary.job, this.summary.cron);
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

    // ✅ 현재 날짜 (오전 5시 기준)
    private getTodayKey(): string {
        const now = new Date();
        const offset = 1000 * 60 * 60 * 5; // 오전 5시 기준
        const localTime = new Date(now.getTime() - offset);
        return localTime.toISOString().slice(0, 10); // YYYY-MM-DD
    }

    // ✅ 스톱워치 시작
    public startStopwatch(userId: string, username: string, guildId: string) {
        const key = this.getUserKey(userId, guildId);
        let record = this.stopwatchMap.get(key);

        if (!record) {
            record = { start: Date.now(), total: 0, username };
            this.stopwatchMap.set(key, record);
        } else if (!record.start) {
            record.start = Date.now();
        }
        // 이미 작동 중이면 무시
    }

    // ✅ 스톱워치 일시정지
    public pauseStopwatch(userId: string, username: string, guildId: string): number {
        const key = this.getUserKey(userId, guildId);
        let record = this.stopwatchMap.get(key);

        if (!record) {
            record = { total: 0, username };
            this.stopwatchMap.set(key, record);
            return 0;
        }

        if (record.start) {
            const now = Date.now();
            const elapsed = now - record.start;
            record.total += elapsed;
            record.start = undefined;
        }

        return record.total;
    }

    // ✅ 경과 시간 확인
    public getElapsedTime(userId: string, guildId: string): number {
        const key = this.getUserKey(userId, guildId);
        const record = this.stopwatchMap.get(key);

        if (!record) return 0;

        let elapsed = record.total;
        if (record.start) {
            elapsed += Date.now() - record.start;
        }

        return elapsed;
    }

    // ✅ 오늘 누적 시간 반환
    public getTodayElapsed(userId: string, guildId: string): number {
        return this.getElapsedTime(userId, guildId); // 현재는 getElapsedTime과 동일한 로직
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
