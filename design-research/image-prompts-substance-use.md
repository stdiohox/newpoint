# Image prompts: Substance use and addiction management

For `/services/substance-use-and-addiction`. Five photographs: one hero and one per card.
Written 2026-10-22 to match the photographs already on the medication-management and
weight-management pages, so the three service pages read as one set.

## Delivery specs

| File | Used for | Generate at | Served at |
|---|---|---|---|
| `public/images/services/addiction-hero-2400.webp` | Page hero (full-bleed, text overlaid in the centre) | 2752 x 1536 | 2400 x 1340 |
| `public/images/services/addiction-consult.webp` | Card 1, "What substance use and addiction care involves" | 2752 x 1536 | 2000 x 1116 |
| `public/images/services/addiction-together.webp` | Card 2, "Substance use and mental health, treated together" | 2752 x 1536 | 2000 x 1116 |
| `public/images/services/addiction-call.webp` | Card 3, "Before you cut down or stop" | 2752 x 1536 | 2000 x 1116 |
| `public/images/services/addiction-plan.webp` | Card 4, "Your treatment plan" | 2752 x 1536 | 2000 x 1116 |

All are 16:9 landscape (about 1.79:1). Cards are cropped to 16:9 and stretched taller on
desktop, so keep the subject in the middle 60% of the frame. Export WebP at quality ~90.
The card files show up on the page as soon as they are in place. The hero also needs
`heroImage` set in `lib/content.ts`, and every alt text must be written from the delivered
frame, not from these prompts.

## House style (paste at the start of every prompt)

> Photorealistic editorial lifestyle photograph, natural soft window daylight, warm
> off-white plaster walls, light oak wood furniture, a sage-green upholstered armchair,
> knitwear in muted tones (oatmeal, rust, slate blue, olive), a potted green plant, calm
> and quiet mood, candid not posed, shallow depth of field, 35mm lens, eye-level, gentle
> film grain, muted natural colour grade, no visible text, 16:9 landscape.

## Negative prompt (use with every image)

> alcohol, beer, wine, bottles, glasses of liquor, pills, pill bottles, syringes, needles,
> cigarettes, smoke, vaping, drug paraphernalia, crying, head in hands, despair, dark
> moody lighting, hospital, clinic signage, white coat, stethoscope, scrubs, scales,
> handcuffs, logos, readable text, watermarks, before-and-after, group therapy circle,
> stock-photo smile, harsh flash

The negative prompt is policy, not taste. A picture of a bottle or a pill on an addiction
page claims something the copy deliberately doesn't. Despair imagery stigmatises the reader
the page is trying to reach. And none of the people may read as a Newpoint clinician, since
the page sits next to the providers' names.

---

## 1. Hero: `addiction-hero-2400.webp`

> [House style] A man in his early forties with short dark hair and a light beard, wearing
> an olive-green crew-neck sweater, sits in a sage-green armchair in the RIGHT THIRD of the
> frame, leaning slightly forward with his forearms resting on his knees and his hands
> loosely together, listening attentively and calmly to someone opposite him. In the LEFT
> foreground, out of focus, the shoulder and back of a second person in a slate-blue shirt,
> seen from behind, no face visible. Between them a small oak side table with a closed
> notebook and a pen. The CENTRE of the frame is a wide, plain, softly lit off-white wall
> with nothing on it. His head sits in the upper-middle of the frame, not near the top
> edge. Bright, airy, hopeful but understated.

Why: the page's headline and intro are centred over this image, so the middle must be calm
wall (the weight hero works the same way). His head is kept off the top edge because the
navbar pill covers the top ~80px. Leaning forward and listening shows engagement, not
crisis.

## 2. Card 1: `addiction-consult.webp`, "What substance use and addiction care involves"

> [House style] A woman in her early thirties with shoulder-length curly hair, wearing a
> rust-colored cardigan over a cream top, sits at a light oak table, speaking and gesturing
> gently with one open hand while she talks. Across the table in the right foreground,
> slightly out of focus, the shoulder and forearm of a second person in a slate-blue
> sweater, seen from behind, resting a pen on an open notebook. A clear glass of water on
> the table. A window with sheer linen curtains on the left, a potted plant on the sill.
> First conversation, open and unhurried.

## 3. Card 2: `addiction-together.webp`, "Substance use and mental health, treated together"

> [House style] A man in his late fifties with grey hair, wearing an oatmeal knit
> cardigan over a dark shirt, sits in a sage-green armchair beside a tall window, a closed
> journal resting on his lap, looking out of the window with a calm, thoughtful expression.
> Soft morning light falls across him. A small oak side table with a ceramic lamp and a
> trailing plant beside the chair. Reflective, steady, not sad.

Why: this card is about the mental-health half of the problem. A reflective, steady person
says "the whole of you" without staging distress.

## 4. Card 3: `addiction-call.webp`, "Before you cut down or stop"

> [House style] A woman in her late forties with short natural hair, wearing a soft
> slate-blue sweater, sits at a light oak kitchen table at home, holding a phone to her ear
> and speaking calmly, her other hand resting flat on the table beside a mug. The phone
> screen is not visible. Morning light from a window behind her, a plant on the counter,
> plain off-white kitchen wall. The moment of reaching out and asking before acting.

Why: the card says "talk to a clinician before you stop", and a phone call is that action
in one picture. The mug must read as an ordinary hot drink: keep it opaque ceramic, not
glass.

## 5. Card 4: `addiction-plan.webp`, "Your treatment plan"

> [House style] Over-the-shoulder view at a light oak table: in focus, a young man in his
> mid-twenties wearing an olive overshirt looks down at a printed single-page sheet on the
> table, nodding slightly, his hand resting near it. In the left foreground, slightly out
> of focus, the hand and grey knit sleeve of a second person pointing to a line on the
> sheet. The text on the sheet is soft and unreadable. A closed laptop and a clear glass of
> water at the edge of the table, a window with linen curtains behind. Collaborative,
> practical, forward-looking.

Why: this matches `med-plan.webp`'s language of a plan being handed over or worked through.
The sheet must stay unreadable, because no real document or instrument is being shown.

---

## Check each delivered image before it ships

- No alcohol, medication, paraphernalia or readable text anywhere in frame, including the
  background.
- Nobody reads as a clinician: no white coat, no lanyard, no stethoscope, no clipboard
  badge.
- Hero: the centre of the frame is plain enough for white text. Check contrast at 1440,
  1024 and 390 the same way the weight hero was checked (see the `heroImage` note on
  weight management in `lib/content.ts`).
- Ages and appearances vary across the five, as they do across the existing set.
