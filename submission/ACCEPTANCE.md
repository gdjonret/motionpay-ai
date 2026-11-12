# Final acceptance checklist

Test on the actual phone and a clean browser before recording. Mark only observed results as complete.

- [ ] Fresh installation/clone starts using only README instructions.
- [ ] SDK 58 opens in the current Expo Go; small-screen keyboard never hides Send.
- [ ] Sign up, confirm email, sign in, reopen app, and sign out all work.
- [ ] User B never sees user A's prior chat or program content; switching during an in-flight reply is safe.
- [ ] Greeting has no media/program card; exact exercise synonyms select the correct catalog item.
- [ ] Squat GIF loads, pauses/plays, has credits, and can be slowed.
- [ ] Squat → external exercise video → slower does not bring back the old squat.
- [ ] Unknown/irrelevant video search shows a useful fallback rather than a mismatched exercise.
- [ ] The beginner-strength request yields a program card; declining purchases does not yield another upsell.
- [ ] Current database price appears on review and PayPal approval.
- [ ] Cancelled/unapproved checkout stays locked.
- [ ] An expired pending order recovers; a transient failure does not create another charge.
- [ ] Approve with a distinct Personal sandbox buyer, verify, open content, reopen app, retain access.
- [ ] Second account remains locked; owned account is not offered another purchase.
- [ ] Program exercise links open the correct details; weekly focuses are distinct.
- [ ] Offline/timeout/provider quota errors are readable and retry works.
- [ ] Request limits return 429 and recover after the window; do not expose Metro publicly.
- [ ] Recovery email redirects are configured and tested if the feature is advertised.
- [ ] Public repo includes root license, all source/migrations/assets, accurate credits, and no secrets.
- [ ] Description matches the final build; no claims of generated exercise footage or professional review.
- [ ] Video shows actual device, is public on YouTube, and lasts under three minutes.
- [ ] Judge access is usable through the judging period; submit links and credentials through appropriate private submission fields, never Git.

Automated checks and synthetic provider checks are recorded in `IMPLEMENTATION_STATUS.md`. This checklist deliberately does not imply that unobserved phone/manual flows passed.
