# MLB Visualizer UX/UI Improvement Goals

Work through these goals one at a time, committing after each:

## 1. Team Name Hyperlinks
Wherever a team name appears (PlayerCard, CompareView, Standings, search results), make it clickable. Link to the MLB team page: https://www.mlb.com/{teamName-lowercase} (e.g. https://www.mlb.com/yankees). Use the team's teamName field.

## 2. Stat Tooltips
When hovering over stat labels (AVG, ERA, OPS, WHIP, etc.) in PlayerCard and CompareView, show a tooltip explaining what that stat is (e.g. "AVG - Batting Average: Hits divided by At Bats"). Add tooltips for all stats shown.

## 3. Merge Single/Compare Into Unified View
Remove the mode toggle for Single/Compare. Default to single player search. When a player card is shown, add a "Compare with..." button/search that lets you search for a second player. The comparison view appears below or alongside. Keep the Teams tab.

## 4. Accessibility Improvements
Ensure proper aria labels on interactive elements, keyboard navigation for search results, focus states on all buttons, alt text on images, semantic HTML (use nav, main, section, article where appropriate).

## 5. UI Consistency Review
Check all components use consistent spacing, font sizes, border radius, color usage. Fix any inconsistencies. Keep the current dark/moody sports card aesthetic - just refine it.

## 6. Minor UX Polish
Add smooth scroll-to when a player card loads. Add a subtle loading skeleton instead of just a spinner. Make the season dropdown more prominent/styled.

## Rules
- Run npm run build after EACH change to verify it compiles
- Commit with: SKIP_DEPLOY_CHECK=1 git add -A && SKIP_DEPLOY_CHECK=1 git commit -m "message" && git push
- Keep the existing dark theme aesthetic - improve, don't replace
- Don't break existing functionality
- Increment version numbers appropriately
