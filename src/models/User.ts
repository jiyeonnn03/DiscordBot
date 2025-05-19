// export class User {
//     public startTime: Date | null;
//     public totalTimeByDay: { [dateKey: string]: number };
  
//     constructor() {
//       this.startTime = null;
//       this.totalTimeByDay = {};
//     }
  
//     public getTodayKey(): string {
//       const now = new Date();
//       now.setHours(now.getHours() - 5); // 오전 5시 기준 날짜 조정
//       // now.setHours(now.getHours() + 15) % 24; // 한국시간 계산, 예: 9시 KST → 0시 UTC
//       return now.toISOString().slice(0, 10);
//     }
  
//     public getCurrentTotal(): Date {
//       const now = new Date();
//       const today = now.toISOString().slice(0, 10); // 2025-05-19
//       const base = this.totalTimeByDay[today] || 0;
//       console.log("User.ts - getCurrentTotal() \nnow:", now, "today:", today, "base:", base)
//       let total = base;
//       console.log("now.getTime():", now.getTime(), "this.startTime.getTime():", this.startTime.getTime())
//       if (this.startTime) {
//         total += Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
//       }
//       console.log("total:", total)

//       return new Date(total * 1000);
//     }
  
//     public startStopwatch(): void {
//       console.log("User.ts - startStopwatch()")

//       if (!this.startTime) {
//         this.startTime = new Date();
//       }
//     }
  
//     public pauseStopwatch(): void {
//       console.log("User.ts - pauseStopwatch()")
//       if (this.startTime) {
//         const now = new Date();
//         const elapsed = now.getTime() - this.startTime.getTime();
//         // const dateKey = this.getTodayKey();
//         const dateKey = now.toISOString().slice(0, 10);
//         this.addTime(dateKey, elapsed);
//         this.startTime = null;
//       }
//     }
  
//     public addTime(dateKey: string, ms: number): void {
//       if (!this.totalTimeByDay[dateKey]) {
//         this.totalTimeByDay[dateKey] = 0;
//       }
//       this.totalTimeByDay[dateKey] += Math.floor(ms / 1000); // 초 단위로 저장
//     }
  
//     public getTotalTime(dateKey: string): number {
//       let total = this.totalTimeByDay[dateKey] || 0;

//       const now = new Date();
//       const currentKey = this.getTodayKey();
//       console.log("User.ts - getTotalTime() \ntotal:", total, "now:", now, "currentKey:", currentKey)

//       if (this.startTime && currentKey === dateKey) {
//         total += Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
//       }
  
//       return total;
//     }
  
//     // public getAllDates(): string[] {
//     //   return Object.keys(this.totalTimeByDay).sort().reverse();
//     // }
//   }
  

export class User {
  public startTime: Date | null;         // 스톱워치 시작 시각
  public totalTimeSeconds: number;       // 누적 시간 (초 단위)

  constructor() {
    this.startTime = null;
    this.totalTimeSeconds = 0;           // 누적 시간은 0초부터 시작
  }

  // 스톱워치 시작
  public startStopwatch(): void {
    if (!this.startTime) {
      this.startTime = new Date();
    }
  }

  // 스톱워치 일시정지
  public pauseStopwatch(): void {
    if (this.startTime) {
      const now = new Date();
      const elapsedMs = now.getTime() - this.startTime.getTime();
      this.totalTimeSeconds += Math.floor(elapsedMs / 1000); // 초 단위로 누적
      this.startTime = null;
    }
  }

  // 현재 누적 시간을 초 단위로 반환
  public getTotalTimeSeconds(): number {
    let total = this.totalTimeSeconds;
    if (this.startTime) {
      const now = new Date();
      total += Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
    }
    return total;
  }

  // 포맷: HH:MM:SS 형태로 표시
  public getFormattedTotalTime(): string {
    const total = this.getTotalTimeSeconds();
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  }
}
