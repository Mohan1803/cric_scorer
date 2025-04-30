import { BallRecord, Player } from './gameStore';

/**
 * Calculate the current partnership runs and balls between the given striker and non-striker.
 * Only counts runs and balls since the last wicket.
 */
/**
 * Calculate the current partnership runs and balls between the given striker and non-striker.
 * Only counts runs and balls since the last wicket.
 */
export function getCurrentPartnership(ballHistory: BallRecord[], striker: Player | null, nonStriker: Player | null) {
  if (!striker || !nonStriker) return { runs: 0, balls: 0 };

  // Find index of last wicket in ballHistory
  let lastWicketIndex = -1;
  for (let i = ballHistory.length - 1; i >= 0; i--) {
    if (ballHistory[i].isWicket) {
      lastWicketIndex = i;
      break;
    }
  }

  // Only consider balls after the last wicket
  const partnershipBalls = ballHistory.slice(lastWicketIndex + 1);

  let runs = 0;
  let balls = 0;
  for (const ball of partnershipBalls) {
    // Only count balls faced by current partnership
    if (
      (ball.batsmanName === striker.name || ball.batsmanName === nonStriker.name) &&
      (!ball.isExtra || (ball.extraType === 'bye' || ball.extraType === 'lb'))
    ) {
      balls++;
      runs += ball.runs;
      // Add extra run for wide/no-ball
      if (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball')) {
        runs++;
      }
    } else if (
      (ball.batsmanName === striker.name || ball.batsmanName === nonStriker.name) &&
      ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball')
    ) {
      // Count runs for wide/no-ball even if not a legal delivery
      runs += ball.runs + 1;
    }
  }

  return { runs, balls };
}

/**
 * Calculate the highest partnership in the ball history.
 * Returns { runs, balls, batsmen: [PlayerName1, PlayerName2] }
 */
export function getHighestPartnership(ballHistory: BallRecord[]) {
  // Track all partnerships: { batsmen: [name1, name2], runs, balls }
  let partnerships: { batsmen: [string, string], runs: number, balls: number }[] = [];
  let currentPartnership: { batsmen: [string, string], runs: number, balls: number } | null = null;

  for (let i = 0; i < ballHistory.length; i++) {
    const ball = ballHistory[i];
    if (!currentPartnership) {
      // On first ball or after wicket, start new partnership
      currentPartnership = {
        batsmen: [ball.batsmanName, getOtherBatsman(ballHistory, i, ball.batsmanName)],
        runs: 0,
        balls: 0,
      };
    }
    // Count this ball
    if (!ball.isExtra || (ball.extraType === 'bye' || ball.extraType === 'lb')) {
      currentPartnership.balls++;
    }
    currentPartnership.runs += ball.runs;
    if (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball')) {
      currentPartnership.runs++;
    }
    // On wicket, push and reset
    if (ball.isWicket) {
      partnerships.push(currentPartnership);
      currentPartnership = null;
    }
  }
  if (currentPartnership) partnerships.push(currentPartnership);
  // Find highest
  let highest = partnerships[0] || { runs: 0, balls: 0, batsmen: ["", ""] };
  for (const p of partnerships) {
    if (p.runs > highest.runs) highest = p;
  }
  return highest;
}

// Helper: Guess the other batsman for a given ball (looks back in history)
export function getOtherBatsman(ballHistory: BallRecord[], idx: number, batsman: string): string {
  // Look for another batsman in previous balls
  for (let i = idx - 1; i >= 0; i--) {
    const prev = ballHistory[i];
    if (prev.batsmanName !== batsman) return prev.batsmanName;
  }
  return "";
}

