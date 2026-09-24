# How I ran outbound for my own job search

*September 2026*

I was laid off from Paycom in May. By August I had sent about 200 applications through job boards, and the reply rate was around 1%. So I stopped treating the search like applying and started treating it like outbound: pick accounts, find the person who actually decides, write something worth reading, and track what happens.

This is what I built, what broke, and the numbers so far.

## The funnel

| Stage | Result |
|---|---|
| Cold applications through job boards (June to August) | ~200 sent, about 1% got a human reply |
| Cold emails to founders, CTOs and hiring managers (Sept 2 to 16) | 35 sent |
| Personal replies | 5 (1 in 7) |
| Calls booked | 4 (a CTO, two talent leads, and a founder who looped in two engineers) |
| Fastest reply | 66 minutes. Another CTO forwarded my email to his talent lead 8 minutes after I sent it. |
| Slowest reply that still turned into a call | 6 days |

Since Sept 20 I've switched to applying and emailing the hiring manager the same hour, at about 40 companies. Most of those are under a week old, so I'm not counting them yet.

## Targeting

Job boards bury the roles that fit. I pulled postings straight from the public APIs behind Greenhouse, Ashby and Lever, plus LinkedIn's public job search, then read the full requirements block of every posting before it made the list. Titles lie. One "Software Engineer II" wanted five years, and one posting with no years line had a five-year screener hidden in the application form.

For one city sweep that meant going through 370 postings to find about 15 real fits. For GTM engineering roles I read 72 postings in full and found that 42 of them wanted three or more years of RevOps experience, which told me where not to spend time.

The accounts that replied had one thing in common: my own project was close to their product. A ledger I'd built for a stablecoin company. A market-data pipeline for a stock exchange.

## Finding the right person

I used Hunter and Apollo on their free tiers, so every lookup had to count. A few things I learned:

- Once you have one real address at a company, you can usually work out the format. A guessed first-initial address bounced; the first-name version went through.
- "Verified" doesn't always mean deliverable. One address Hunter marked verified bounced anyway, on a domain Hunter said accepted all mail. A bounce is still useful, because it tells you the server does reject bad addresses.
- Check the domain before the name. One lookup returned a completely different company with a similar name.
- The CEO isn't always the one who answers. At one company, an engineering manager replied to an email I'd sent to the CEO.

## The message

My first emails were long and tried to cover everything. The one that got a reply in 66 minutes was about 100 words, with this structure:

1. One sentence framing their product as a problem I'd already worked on.
2. One or two sentences on what I built, with a concrete detail.
3. One line on my last job, then where I'm located and a simple ask.

A batch of twelve, mostly longer, emails got nothing back within two days. Two of them did eventually reply, after three and four days, so part of the lesson was patience. Every reply to a cold email came from the first send, so I stopped writing follow-ups.

## Keeping it human

I use Claude Code for the research: pulling postings, filtering by requirements, finding contacts, drafting. I read and edit every email before it goes out, and I run every draft through a small checker that flags sentences that sound machine-written (flat sentence rhythm, three-part lists, quotable closing lines). Drafts that tripped it got rewritten. Several drafts I threw out entirely because they sounded like a template, even when the checker passed them.

## What I'd automate next

Right now the loop runs through scripts and me. The next step is putting it on real GTM tooling: enrichment and scoring in Clay or n8n, a proper sequence with reply tracking instead of a markdown log, and a weekly readout of reply rate by segment. That's close to the job I'm applying for, which is part of why I want it.

---

Resume: https://shifan.me/hereismyresume/ai/ · GitHub: https://github.com/hirashif
