export type SpringAxisState = {
  value: number;
  velocity: number;
};

/** Advances one axis of a critically damped spring toward a moving target. */
export function stepZeroBounceSpring(
  state: SpringAxisState,
  target: number,
  deltaSeconds: number,
  angularFrequency: number,
): SpringAxisState {
  if (deltaSeconds <= 0) return state;

  const displacement = state.value - target;
  const coefficient = state.velocity + angularFrequency * displacement;
  const decay = Math.exp(-angularFrequency * deltaSeconds);

  return {
    value: target + (displacement + coefficient * deltaSeconds) * decay,
    velocity:
      (state.velocity - angularFrequency * coefficient * deltaSeconds) * decay,
  };
}
