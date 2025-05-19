export class User {
  public startTime: Date | null;         // 스톱워치 시작 시각
  public totalTimeSeconds: number;       // 누적 시간(초 단위)

  constructor() {
    this.startTime = null;
    this.totalTimeSeconds = 0;           // 누적 시간 0초부터 시작
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
