/**
 * seedKnowledge.js — One-time script to populate the Vector DB with UI/design knowledge.
 *
 * Run with:
 *   node src/scripts/seedKnowledge.js
 *
 * This script:
 *   1. Connects to MongoDB Atlas
 *   2. Generates Gemini embeddings for each knowledge chunk
 *   3. Upserts them into the `knowledge_chunks` collection
 *
 * You can re-run this at any time to add or refresh knowledge.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { generateEmbedding } from '../services/embeddingService.js';
import KnowledgeChunk from '../models/KnowledgeChunk.js';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE — Add more chunks here to improve generation quality
// ─────────────────────────────────────────────────────────────────────────────
const KNOWLEDGE_CHUNKS = [
  // ─── LAYOUT TEMPLATES ──────────────────────────────────────────────────────
  {
    title: 'Dashboard Layout — Sidebar + Main Content',
    category: 'layout',
    tags: ['dashboard', 'sidebar', 'admin', 'layout', 'navigation'],
    text: `A standard admin dashboard layout uses a persistent left sidebar (240px wide) for navigation and a main content area for data/widgets.
Key elements:
- Sidebar: logo at top, vertical nav links with icons, user profile at bottom
- Header bar: page title (left), search bar + notification bell + avatar (right)
- Content grid: KPI cards row at top (total users, revenue, active sessions), then charts and tables below
- Responsive: sidebar collapses to icon-only on tablets, full hamburger drawer on mobile
Color usage: sidebar uses a dark bg (#1e293b), main content uses light bg (#f8fafc), accent color for active nav item.`,
  },
  {
    title: 'Authentication — Login & Register Screens',
    category: 'template',
    tags: ['login', 'register', 'auth', 'form', 'password', 'signup', 'authentication'],
    text: `Auth screens follow a centered card pattern on a subtle gradient background.
Login screen elements:
- App logo + name at top
- Email input with envelope icon
- Password input with eye toggle for show/hide
- "Forgot password?" link (right-aligned below password)
- Primary "Sign In" button (full-width)
- Social login: "Continue with Google" button (outlined)
- Link to register page: "Don't have an account? Sign up"
Register screen additions:
- Full name input at top
- Confirm password field
- Terms & Privacy checkbox
Validation: show inline error messages in red below each field. Show loading spinner on submit button.
Glassmorphism variant: card uses backdrop-blur with rgba(255,255,255,0.1) bg on a gradient background.`,
  },
  {
    title: 'E-commerce Product Listing & Cart',
    category: 'template',
    tags: ['ecommerce', 'shopping', 'cart', 'product', 'listing', 'shop', 'store', 'checkout'],
    text: `E-commerce product listing page:
- Filter sidebar (left): category checkboxes, price range slider, rating stars filter, "Clear filters" button
- Product grid (right): 3-col desktop, 2-col tablet, 1-col mobile
- Product card: image (aspect-ratio 1:1), name, rating stars, price (with strikethrough original price if sale), "Add to Cart" button
- Search + Sort bar at top of grid: search input, sort dropdown (Price: Low→High, Rating, Newest)
Shopping cart (slide-in drawer from right):
- Cart item rows: thumbnail, name, quantity spinner (+/-), line total, remove icon
- Cart summary: subtotal, shipping, tax, grand total
- "Proceed to Checkout" CTA button
- "Continue Shopping" link`,
  },
  {
    title: 'Food Delivery App — Order Flow',
    category: 'template',
    tags: ['food', 'delivery', 'restaurant', 'order', 'menu', 'mobile', 'app'],
    text: `Food delivery mobile-first layout:
Home screen: search bar at top, location selector, category pills (Pizza, Sushi, Burgers…), "Near You" restaurant cards (image banner, name, rating, delivery time, minimum order).
Restaurant screen: hero banner, restaurant info (name, rating, cuisine tags, hours), menu grouped by categories (Starters, Mains, Desserts, Drinks), menu item cards with image, name, description, price, + button.
Cart & Checkout: bottom sticky cart bar (items count + total + "View Cart"), checkout screen with address selection, payment method (card/cash), order summary, place order button.
Order tracking: map view showing driver location, order status stepper (Placed → Confirmed → Preparing → On the way → Delivered).`,
  },
  {
    title: 'SaaS Landing Page Structure',
    category: 'layout',
    tags: ['landing', 'saas', 'hero', 'marketing', 'homepage', 'cta'],
    text: `SaaS landing page sections (top to bottom):
1. Navbar: logo (left), nav links (center), "Login" + "Start Free Trial" buttons (right). Sticky on scroll with blur backdrop.
2. Hero: large headline (48px bold), subheadline (20px muted), two CTAs (primary filled + secondary outlined), product screenshot/mockup below.
3. Social proof: logos of well-known customers in a horizontal strip with "Trusted by X companies" caption.
4. Features: 3-col icon grid, each with icon, bold title, 2-line description.
5. How it works: numbered steps (1-2-3) with alternating screenshot + text layout.
6. Pricing: 3 tiers (Free / Pro / Enterprise) with feature comparison table, most popular plan highlighted with accent border.
7. Testimonials: quote cards with avatar, name, role, company.
8. Footer: 4-col links + social icons + copyright.`,
  },
  {
    title: 'Data Table with Pagination & Filters',
    category: 'component',
    tags: ['table', 'data', 'pagination', 'filter', 'search', 'sort', 'admin', 'list'],
    text: `Standard data table component:
- Header row: column titles, sortable columns show up/down chevron icons. Clicking toggles asc/desc.
- Body rows: alternating row background for readability (even rows slightly darker), hover state.
- Row actions: "Edit" pencil icon + "Delete" trash icon at the end of each row (visible on hover or always shown).
- Bulk actions: checkbox column (first col), "Select all" in header, bulk action bar appears at top when items selected (Delete, Export).
- Search input above table (filters in real-time or on enter).
- Column filters: dropdown per column for categorical data.
- Pagination footer: showing "1-20 of 350 results", previous/next arrows, page size selector (10/20/50/100).`,
  },
  {
    title: 'Dark Mode Design Principles',
    category: 'guideline',
    tags: ['dark mode', 'dark theme', 'colors', 'contrast', 'night mode'],
    text: `Dark mode color guidelines:
Backgrounds: use multiple elevation layers — darkest (#0f172a) for page bg, slightly lighter (#1e293b) for cards/sidebars, (#334155) for hovered/elevated elements. Never use pure black (#000).
Text: primary text #f8fafc (near white), secondary/muted text #94a3b8, disabled text #475569.
Accent colors: keep them slightly desaturated in dark mode (e.g. indigo-400 instead of indigo-600) to prevent harshness.
Borders: use #334155 (low contrast) for dividers, #475569 for input borders.
Inputs: bg #1e293b, border #334155, focus ring uses accent color with 20% opacity glow.
Avoid: pure white text on pure black, saturated colors that look harsh, red error text that's too bright.
Shadows: in dark mode use colored shadows (e.g. shadow of the accent color with low opacity) rather than grey.`,
  },
  {
    title: 'Mobile-First Navigation Patterns',
    category: 'pattern',
    tags: ['mobile', 'navigation', 'bottom bar', 'hamburger', 'responsive', 'nav'],
    text: `Mobile navigation patterns:
Bottom navigation bar (most common for apps): 4-5 icon tabs at bottom of screen. Active tab has filled icon + label, inactive tabs have outlined icon only. Tab bar uses elevated bg with top border.
Hamburger menu (for content-heavy apps): full-screen drawer slides in from left. Contains logo, nav links with icons, and user info at bottom. Overlay dims the main content.
Tab bar on top (for secondary navigation within a page): horizontal scrollable tabs, active tab has underline accent or filled pill background.
Breadcrumbs: only on desktop or tablets for deep navigation hierarchies. On mobile collapse to just "< Back".
Sticky header: app bar with back arrow (if nested), page title (center), action buttons (right, max 2 icons).`,
  },
  {
    title: 'Form Design & Validation Best Practices',
    category: 'guideline',
    tags: ['form', 'input', 'validation', 'error', 'UX', 'accessibility'],
    text: `Form design guidelines:
Input fields: label always above the input (not inside as placeholder). Placeholder text is a light hint, never the label. Input has 1px border, gains 2px accent-colored ring on focus. Border-radius: 8px.
Field order: most important / least friction fields first. Group related fields together.
Error states: red border on the field, red error message text directly below the field (not a toast). Show errors on blur or on submit attempt, not while typing.
Success state: green checkmark icon inside the input at the right edge.
Required fields: asterisk (*) next to label, legend at top of form: "* Required".
Submit button: disabled state while submitting (show spinner), full-width on mobile.
Multi-step forms: show a step progress indicator at the top. Each step validates before advancing.
Accessibility: all inputs must have associated <label> elements. Use aria-describedby for error messages.`,
  },
  {
    title: 'Glassmorphism UI Pattern',
    category: 'pattern',
    tags: ['glassmorphism', 'glass', 'blur', 'frosted', 'modern', 'visual', 'style'],
    text: `Glassmorphism visual style implementation:
Core properties: backdrop-filter: blur(12px), background: rgba(255,255,255,0.1), border: 1px solid rgba(255,255,255,0.2), border-radius: 16px.
Works best on: cards, modals, nav bars, sidebars placed over colorful gradient or image backgrounds.
Background: use a vibrant gradient or abstract blobs (e.g. two large blurred circles in purple and blue) as the page background.
Text on glass: use white or near-white text for readability. Add text-shadow: 0 1px 2px rgba(0,0,0,0.2) if contrast is too low.
Dark glassmorphism: background: rgba(0,0,0,0.3), border: 1px solid rgba(255,255,255,0.1).
Shadow: box-shadow: 0 8px 32px 0 rgba(31,38,135,0.37) for depth.
Avoid: too many nested glass elements (looks muddy). Keep background blur radius consistent (8-16px).`,
  },
  {
    title: 'Notification & Toast System',
    category: 'component',
    tags: ['notification', 'toast', 'alert', 'feedback', 'success', 'error', 'warning'],
    text: `Notification/toast component:
Position: top-right corner of screen, 16px from edges. Stack multiple toasts vertically with 8px gap.
Types: success (green, check icon), error (red, x icon), warning (amber, triangle icon), info (blue, i icon).
Structure: colored left border (4px) or colored icon, title (bold), optional description, optional action button, close (x) button.
Duration: auto-dismiss after 4s (success/info) or 6s (error/warning). Hover pauses the timer.
Animation: slide in from right + fade in on appear. Slide out + fade out on dismiss.
Progress bar: thin colored line at bottom of toast showing time remaining.
Toast manager: max 3 toasts visible at once. Older ones get pushed down or removed.
Accessibility: role="alert" for errors, role="status" for success. Screen-reader friendly.`,
  },
  {
    title: 'Healthcare / Medical App UI Patterns',
    category: 'template',
    tags: ['healthcare', 'medical', 'hospital', 'doctor', 'patient', 'appointment', 'health'],
    text: `Healthcare application UI:
Dashboard: patient vitals cards (heart rate, blood pressure, SpO2, temperature) with mini sparkline charts. Upcoming appointments list. Medication reminders section.
Appointment booking: calendar picker showing available time slots (green = open, grey = taken). Doctor profile cards (photo, name, specialization, rating, "Book Now" button).
Patient profile: avatar, personal info, medical history accordion, current medications list, upcoming & past appointments tabs.
Color palette: keep it calm and professional — primary blue (#2563eb) or teal (#0d9488), white backgrounds, light grey (#f1f5f9) for sections. Avoid aggressive reds (except for critical alerts).
Trust signals: doctor credentials, verified badges, privacy policy visible.
Critical alerts: red banner for urgent notifications (abnormal lab results, missed medication).`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const chunk of KNOWLEDGE_CHUNKS) {
    process.stdout.write(`  Embedding: "${chunk.title}"... `);
    try {
      const embedding = await generateEmbedding(`${chunk.title}\n${chunk.text}`);

      await KnowledgeChunk.findOneAndUpdate(
        { title: chunk.title },
        { ...chunk, embedding },
        { upsert: true, new: true }
      );

      // Check if it was a new doc or update
      const isNew = !(await KnowledgeChunk.exists({ title: chunk.title, createdAt: { $lt: new Date() } }));
      created++;
      console.log(`✓ (${embedding.length} dims)`);

      // Small delay to respect Gemini free-tier rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`✗ FAILED — ${error.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   ✓ Upserted : ${KNOWLEDGE_CHUNKS.length - failed}`);
  console.log(`   ✗ Failed   : ${failed}`);
  console.log(`\n📌 NEXT STEP: Create a Vector Search index in MongoDB Atlas UI:`);
  console.log(`   Collection : knowledge_chunks`);
  console.log(`   Index name : vector_index`);
  console.log(`   Field      : embedding (100 dims, cosine similarity)\n`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
