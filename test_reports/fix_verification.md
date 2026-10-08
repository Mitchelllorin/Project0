# Rack dismissal follow-up — 2026-10-08

Original issue: iteration_1 reported rack double-click dismissal unreliable.

Fixes: broadened transparent raycast target; explicit accessible remove action; native touch down/up raycast recognition; render on demand with animation invalidation to avoid main-thread stalls delaying mobile double-taps.

Observed checks:
- Desktop1920×800: true mouse dblclick on world-projected rack hit area set local configuration rack=none; quote rack line count0.
- Touch-enabled mobile390×844: actual Playwright touchscreen taps at rack coordinates,140ms apart, set rack=none; quote rack line count0.
- No horizontal overflow at either viewport.
- Staged assembly still animates/rendered at100% after demand-render change.

Evidence screenshot tool run: `/root/.emergent/automation_output/20261008_225832/console_20261008_225832.log`.
Iteration1 historical report remains unchanged to preserve the original finding. The reported issue is resolved by the checks above.