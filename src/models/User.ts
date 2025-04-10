export class User {
    public startTime: Date | null;
    public totalTimeByDay: { [dateKey: string]: number };
  
    constructor() {
      this.startTime = null;
      this.totalTimeByDay = {};
    }
  
    private formatDateKey(date: Date): string {
      return date.toISOString().split('T')[0];
    }
  
    public getTodayKey(): string {
      const now = new Date();
      // now.setHours(now.getHours() - 5); // 오전 5시 기준 날짜 조정
      now.setHours(now.getHours() + 15) % 24; // 한국시간 계산, 예: 9시 KST → 0시 UTC
      return now.toISOString().slice(0, 10);
    }
  
    public getCurrentTotal(): Date {
      const now = new Date();
      const today = this.getTodayKey();
      const base = this.totalTimeByDay[today] || 0;
  
      let total = base;
      if (this.startTime) {
        total += Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
      }
  
      return new Date(total * 1000);
    }
  
    public startStopwatch(): void {
      if (!this.startTime) {
        this.startTime = new Date();
      }
    }
  
    public pauseStopwatch(): void {
      if (this.startTime) {
        const now = new Date();
        const elapsed = now.getTime() - this.startTime.getTime();
        const dateKey = this.getTodayKey();
        this.addTime(dateKey, elapsed);
        this.startTime = null;
      }
    }
  
    public addTime(dateKey: string, ms: number): void {
      if (!this.totalTimeByDay[dateKey]) {
        this.totalTimeByDay[dateKey] = 0;
      }
      this.totalTimeByDay[dateKey] += Math.floor(ms / 1000); // 초 단위로 저장
    }
  
    public getTotalTime(dateKey: string): number {
      let total = this.totalTimeByDay[dateKey] || 0;
  
      const now = new Date();
      const currentKey = this.getTodayKey();
  
      if (this.startTime && currentKey === dateKey) {
        total += Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
      }
  
      return total;
    }
  
    public getAllDates(): string[] {
      return Object.keys(this.totalTimeByDay).sort().reverse();
    }
  }
  