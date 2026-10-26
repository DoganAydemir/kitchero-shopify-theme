"""Demo store copy for the Kitchero preview/live theme.

Replaces placeholder copy, unverifiable claims, "KITCHERO" eyebrows,
"Verified customer" roles and repeated intro paragraphs in the demo
content pulled from the live theme. Only touches settings that exist,
so it is safe to run repeatedly (a no-op once the content is updated).

Usage: python3 demo_content.py <theme root>
"""
import json
import re
import sys

root = sys.argv[1] if len(sys.argv) > 1 else '.'

INTRO_PAGES = {
    'templates/page.about.json': ('hero', 'Our story',
        'We design kitchens around the way people cook, gather, and live, one layout, finish, and detail at a time.'),
    'templates/page.contact.json': ('page_header_dotted_7gVf7L', 'Get in touch',
        'Questions about a product, an order, or a full kitchen project? Visit a studio or send us a message.'),
    'templates/page.deals.json': ('header', 'Limited time',
        'Selected cabinet sets at reduced prices while the offer lasts.'),
    'templates/page.financing.json': ('banner_cover_DMti8r', 'Payment options', None),
}

SHOWCASE_PAGES = {
    'templates/page.content-faq.json': ('Help center',
        'Answers to common questions about delivery, installation, and choosing the right products.'),
    'templates/page.galleries.json': ('Gallery',
        'Lookbooks, project photos, and finish inspiration, shown in four gallery layouts.'),
    'templates/page.heroes-banners.json': ('Heroes & banners',
        'Hero and banner layouts for launches, collections, and seasonal campaigns.'),
    'templates/page.image-with-text.json': ('Image with text',
        'Image-and-text layouts for brand stories, product details, and process pages.'),
    'templates/page.sliders.json': ('Sliders',
        'Slideshow and carousel layouts for collections, stories, and campaigns.'),
}

# (file, section id, block id or None, {setting: value})
EDITS = [
    # Header and footer
    ('sections/header-group.json', 'announcement-banner', 'announcement-1',
        {'text': 'New cabinet finishes for fall — explore the color library'}),
    ('sections/header-group.json', 'announcement-banner', 'announcement_PBAwCp',
        {'text': 'Plan your kitchen with our design team — request a consultation'}),
    ('sections/header-group.json', 'header', None, {'mobile_cta_text': 'Request a quote'}),
    ('sections/header-group.json', 'header', 'menu_link_badge_YxnfCJ', {'badge_text': 'Sale'}),
    ('sections/footer-group.json', 'footer', 'link_list_r7bk7C', {'heading': 'Shop'}),

    # Home
    ('templates/index.json', 'trust_bar', 'stat_1', {'value': '30', 'prefix': '', 'label': 'Products in the catalog'}),
    ('templates/index.json', 'trust_bar', 'stat_2', {'value': '6', 'prefix': '', 'label': 'Product categories'}),
    ('templates/index.json', 'trust_bar', 'stat_3', {'value': '2', 'prefix': '', 'label': 'Design studios in New York'}),
    ('templates/index.json', 'trust_bar', 'stat_4', {'value': '3', 'prefix': '', 'label': 'Hardware finishes'}),
    ('templates/index.json', 'ecosystem', 'feat_1', {'description':
        'Cabinet layouts planned around your room, your appliances, and the way you cook, from galley kitchens to open-plan islands.'}),
    ('templates/index.json', 'ecosystem', 'feat_2', {'description':
        'Pull-outs, drawer organizers, and corner solutions that keep every pan, spice, and utensil within easy reach.'}),
    ('templates/index.json', 'why_choose_us', None, {'description':
        'Every set is configured to your layout and finish, with durable materials chosen for daily use in busy family kitchens.'}),
    ('templates/index.json', 'why_choose_us', 'wcu_1', {'description':
        'Every product is made with carefully selected materials and finishes chosen for everyday use.'}),
    ('templates/index.json', 'why_choose_us', 'wcu_2', {'description':
        'Our design team helps with layouts, finishes, and hardware so every detail works together.'}),
    ('templates/index.json', 'why_choose_us', 'wcu_3', {'title': 'Ongoing support', 'description':
        'From the first consultation to installation questions, our team is a message away.'}),
    ('templates/index.json', 'shop_the_look', 'h1', {'product_title': '', 'product_price': ''}),
    ('templates/index.json', 'shop_the_look', 'h2', {'product_title': '', 'product_price': ''}),
    ('templates/index.json', 'shop_the_look', 'h3', {'product_title': '', 'product_price': ''}),
    ('templates/index.json', 'home_financing', None, {'label': 'Flexible payment'}),
    ('templates/index.json', 'testimonials', 't1', {'name': 'Emily Carter', 'role': 'Homeowner'}),
    ('templates/index.json', 'testimonials', 't2', {'name': 'James Wilson', 'role': 'Renovation client'}),
    ('templates/index.json', 'testimonials', 't3', {'name': 'Sophia Martin', 'role': 'Homeowner'}),

    # Logos: five distinct fictional brands (uploaded to Admin > Files)
    ('templates/index.json', 'brands', 'b1', {'image': 'shopify://shop_images/brand-varenholt.png', 'alt': 'Varenholt'}),
    ('templates/index.json', 'brands', 'b2', {'image': 'shopify://shop_images/brand-quillstone.png', 'alt': 'Quillstone'}),
    ('templates/index.json', 'brands', 'b3', {'image': 'shopify://shop_images/brand-alder-pine.png', 'alt': 'Alder & Pine'}),
    ('templates/index.json', 'brands', 'b4', {'image': 'shopify://shop_images/brand-marrowick.png', 'alt': 'Marrowick'}),
    ('templates/index.json', 'brands', 'b5', {'image': 'shopify://shop_images/brand-tessaline.png', 'alt': 'Tessaline'}),
    ('templates/page.financing.json', 'partners', None, {'description':
        'We work with established lenders so you can pick the option that fits your budget, with terms shown before you commit.'}),
    ('templates/page.financing.json', 'partners', 'p1', {'name': 'Corvan Pay',
        'logo_image': 'shopify://shop_images/partner-corvan-pay-mark.png'}),
    ('templates/page.financing.json', 'partners', 'p2', {'name': 'Fernlight Credit',
        'logo_image': 'shopify://shop_images/partner-fernlight-credit-mark.png'}),

    # Blog and cart
    ('templates/blog.json', 'main', None, {'description':
        'Planning guides, finish ideas, and care tips for kitchens that work as well as they look.'}),
    ('templates/cart.json', 'main', None, {
        'description': 'Review your items and check out securely.',
        'trust_shipping_text': 'Shipping calculated at checkout',
        'trust_returns_text': 'Returns accepted on unused items'}),

    # About
    ('templates/page.about.json', 'materials_quote', None, {'author_name': 'Emma Richardson', 'author_title': 'Homeowner'}),
    ('templates/page.about.json', 'gallery_section', 'i1', {'caption_title': 'Layout', 'caption_description': 'Planned around your space'}),
    ('templates/page.about.json', 'gallery_section', 'i2', {'caption_title': 'Materials', 'caption_description': 'Chosen for daily use'}),
    ('templates/page.about.json', 'gallery_section', 'i3', {'caption_title': 'Details', 'caption_description': 'Hardware and finishes'}),
    ('templates/page.about.json', 'gallery_section', 'i4', {'caption_title': 'Storage', 'caption_description': 'Everything within reach'}),

    # Contact: no 555 numbers, example.com addresses or full street addresses of real buildings
    ('templates/page.contact.json', 'main', 's1', {'address': 'Madison Avenue, New York, NY', 'phone': '', 'email': ''}),
    ('templates/page.contact.json', 'main', 's2', {'address': 'Wythe Avenue, Brooklyn, NY', 'phone': '', 'email': ''}),

    # Content & FAQ
    ('templates/page.content-faq.json', 'collapsible_visual_wiwbcq', 'feature_J7fFFM', {'content':
        'Solid cabinet boxes, durable finishes, and hardware made for everyday use.'}),
    ('templates/page.content-faq.json', 'collapsible_visual_wiwbcq', 'feature_KbwdEJ', {'content':
        'Every order is covered by our quality guarantee. See the warranty policy for details.'}),

    # Deals: prices match the linked products; compare-at prices are set on those products in Admin
    ('templates/page.deals.json', 'main', None, {'bottom_description':
        "Planning a larger layout or a full remodel? Tell us about your space and we'll put together a quote."}),
    ('templates/page.deals.json', 'main', 'd1', {'link': 'shopify://products/signature-built-in-kitchen-set',
        'price': '$1,780', 'original_price': '$2,095', 'accent_text': ''}),
    ('templates/page.deals.json', 'main', 'd2', {'link': 'shopify://products/contemporary-cabinet-kitchen-set',
        'price': '$2,100', 'original_price': '$2,480', 'accent_text': ''}),
    ('templates/page.deals.json', 'main', 'd3', {'link': 'shopify://products/elegant-custom-kitchen-cabinets',
        'price': '$2,750', 'original_price': '$3,240', 'accent_text': ''}),

    # Financing
    ('templates/page.financing.json', 'panel_1', None, {'floating_eyebrow': 'Plan lengths', 'floating_value': '12–36 months'}),
    ('templates/page.financing.json', 'panel_2', None, {'floating_eyebrow': 'At checkout', 'floating_value': 'One simple step',
        'floating_description': "Choose financing as your payment method and follow the lender's short application."}),
    ('templates/page.financing.json', 'calculator', None, {'cta_link': 'shopify://pages/contact', 'disclaimer':
        '<p>For illustration only. Rates, terms, and eligibility are set by the lender and subject to credit approval.</p>'}),
    ('templates/page.financing.json', 'calculator', 't1', {'apr': 0, 'apr_label': ''}),
    ('templates/page.financing.json', 'calculator', 't2', {'apr': 7.99, 'apr_label': ''}),
    ('templates/page.financing.json', 'calculator', 't3', {'apr': 9.99, 'apr_label': ''}),
    ('templates/page.financing.json', 'faq', 'q1', {'content':
        "<p>Most lenders allow early payoff without a penalty. Check your plan's terms in your lender's dashboard.</p>"}),
    ('templates/page.financing.json', 'faq', 'q4', {'content':
        '<p>Any fees are set by the lender and shown before you accept your plan. Review the terms at checkout before you confirm.</p>'}),
    ('templates/page.financing.json', 'bottom_cta', None, {'description':
        'Pick the financing option that fits, then browse the collection and place your order. '
        'Terms are shown before you confirm, and you can review your plan anytime with your lender.'}),

    # Heroes & banners
    ('templates/page.heroes-banners.json', 'banner_hero_QrPRKd', None, {'heading_line2_italic': 'the everyday kitchen',
        'description': 'Cabinet sets, fixtures, and hardware designed to work together from the first sketch.'}),
    ('templates/page.heroes-banners.json', 'banner_cover_ceHKE3', None, {'description':
        'A fresh take on storage, finishes, and flow, planned around the way you cook.'}),
    ('templates/page.heroes-banners.json', 'banner_split_E7KPXA', None, {'heading_line2_italic': 'now on sale.',
        'description': 'Reduced prices on selected cabinet sets while the offer lasts.'}),
    ('templates/page.heroes-banners.json', 'banner_minimal_K3VK4y', None, {'description':
        'Clean lines, quiet finishes, and storage that keeps the counters clear.'}),
    ('templates/page.heroes-banners.json', 'video_bg_hero_t4fwhN', None, {'eyebrow': 'In motion',
        'heading': 'Kitchens in motion.', 'cta_text': 'Explore the collection',
        'description': 'See finishes, hardware, and layouts the way they look in a real home.'}),

    # Image with text
    ('templates/page.image-with-text.json', 'image_with_text_overlay_KeeX9a', None, {'description':
        'Layouts, storage, and finishes planned around the rhythm of your day.'}),
    ('templates/page.image-with-text.json', 'image_with_text_parallax_9kLVt9', None, {'description':
        'From the first sketch to installation day, every step is planned with you.'}),
    ('templates/page.image-with-text.json', 'image_with_text_alternating_xkdwG3', 'row_KathUD', {
        'item_heading': 'Plan the layout', 'item_description':
        'Start with measurements and how you use the room. We map work zones, storage, and traffic flow.'}),
    ('templates/page.image-with-text.json', 'image_with_text_alternating_xkdwG3', 'row_p7y3PU', {
        'item_heading': 'Choose your finishes', 'item_description':
        'Compare door styles, colors, and hardware side by side before you order.'}),
    ('templates/page.image-with-text.json', 'image_with_text_alternating_xkdwG3', 'row_3wTbxe', {
        'item_heading': 'Install with confidence', 'item_description':
        'Every set ships with clear instructions, and our team is available for installation questions.'}),

    # Default page template
    ('templates/page.json', 'main', None, {'header_eyebrow': '', 'header_description': ''}),

    # Sliders
    ('templates/page.sliders.json', 'slider_drag_carousel_WawtfA', 'slide_GK4WYq', {'caption_title': 'Kitchen essentials', 'caption_subtitle': 'Everyday tools'}),
    ('templates/page.sliders.json', 'slider_drag_carousel_WawtfA', 'slide_KhiwwX', {'caption_title': 'Cabinet styles', 'caption_subtitle': 'Modern cabinets'}),
    ('templates/page.sliders.json', 'slider_drag_carousel_WawtfA', 'slide_aP6hJi', {'caption_title': 'Fixtures', 'caption_subtitle': 'Faucets & sinks'}),
    ('templates/page.sliders.json', 'slider_drag_carousel_WawtfA', 'slide_3xCLtp', {'caption_title': 'Storage solutions', 'caption_subtitle': 'Organized kitchens'}),
    ('templates/page.sliders.json', 'slider_drag_carousel_WawtfA', 'slide_TQ4zk6', {'caption_title': 'Hardware', 'caption_subtitle': 'Pulls & knobs'}),
    ('templates/page.sliders.json', 'slider_drag_carousel_WawtfA', 'slide_XdnzrW', {'caption_title': 'Full kitchens', 'caption_subtitle': 'Cabinet sets'}),

    # Testimonials
    ('templates/page.testimonials.json', 'marquee', 't1', {'author_role': 'Homeowner'}),
    ('templates/page.testimonials.json', 'marquee', 't2', {'author_role': 'Renovation client'}),
    ('templates/page.testimonials.json', 'marquee', 't3', {'author_role': 'Interior designer'}),
    ('templates/page.testimonials.json', 'pullquote', None, {'author_name': 'Sarah L.', 'author_title': 'Homeowner'}),
    ('templates/page.testimonials.json', 'pullquote', 'quote_hLbpdi', {'author_title': 'Homeowner'}),
    ('templates/page.testimonials.json', 'pullquote', 'quote_pre7qp', {'author_title': 'Renovation client'}),
    ('templates/page.testimonials.json', 'grid', 't1', {'role': 'Homeowner'}),
    ('templates/page.testimonials.json', 'grid', 't2', {'role': 'Renovation client'}),
    ('templates/page.testimonials.json', 'grid', 't3', {'role': 'Interior designer'}),
    ('templates/page.testimonials.json', 'closing', None, {'description':
        "Tell us about your space and timeline, and we'll help you plan the next step."}),

    # Showroom product page
    # Dynamic-source accordions: no <p> wrapper (description/metafield HTML
    # already contains block elements, so the wrapper produced nested <p>).
    ('templates/product.showroom.json', 'main', 'acc1', {'content': '{{ product.description }}'}),
    ('templates/product.showroom.json', 'main', 'acc4', {'content': '{{ product.metafields.custom.delivery | metafield_tag }}'}),
    ('templates/product.showroom.json', 'main', 'ctas', {'primary_cta_text': 'Request a consultation',
        'secondary_cta_text': 'Contact us', 'secondary_cta_link': 'shopify://pages/contact', 'secondary_icon': 'mail'}),
]

GALLERY_CAPTIONS = {
    'gallery_focus_wall_mhC4L9': ('caption_title', 'caption_description', [
        ('Park Slope residence', 'Brooklyn, NY'), ('Upper West Side apartment', 'New York, NY'),
        ('Montclair family home', 'Montclair, NJ'), ('Hoboken loft', 'Hoboken, NJ'),
        ('Westchester remodel', 'Westchester, NY'), ('Williamsburg studio', 'Brooklyn, NY')]),
    'gallery_marquee_diDphp': ('caption_title', 'caption_subtitle', [
        ('Tribeca loft', 'New York, NY'), ('Riverdale home', 'Bronx, NY'),
        ('Jersey City condo', 'Jersey City, NJ'), ('Greenwich remodel', 'Greenwich, CT'),
        ('Astoria apartment', 'Queens, NY'), ('Scarsdale kitchen', 'Scarsdale, NY')]),
}


def load(path):
    text = open(path, encoding='utf-8').read()
    match = re.match(r'\s*/\*.*?\*/\s*', text, re.S)
    head = match.group(0) if match else ''
    return head, json.loads(text[len(head):])


cache = {}


def doc(rel):
    if rel not in cache:
        try:
            cache[rel] = [*load(f'{root}/{rel}'), False]
        except FileNotFoundError:
            cache[rel] = None
    return cache[rel]


def apply(rel, section_id, block_id, values):
    entry = doc(rel)
    if not entry:
        return
    section = entry[1].get('sections', {}).get(section_id)
    if not section:
        return
    target = section if block_id is None else section.get('blocks', {}).get(block_id)
    if target is None:
        return
    settings = target.setdefault('settings', {})
    for key, value in values.items():
        if settings.get(key) != value:
            settings[key] = value
            entry[2] = True


for rel, (section_id, eyebrow, description) in INTRO_PAGES.items():
    values = {'eyebrow': eyebrow}
    if description:
        values['description'] = description
    apply(rel, section_id, None, values)

for rel, (eyebrow, description) in SHOWCASE_PAGES.items():
    apply(rel, 'main', None, {'header_eyebrow': eyebrow, 'header_description': description})

for rel, section_id, block_id, values in EDITS:
    apply(rel, section_id, block_id, values)

entry = doc('templates/page.galleries.json')
if entry:
    for section_id, (title_key, sub_key, captions) in GALLERY_CAPTIONS.items():
        section = entry[1]['sections'].get(section_id)
        if not section:
            continue
        for block_id, (title, sub) in zip(section.get('block_order', []), captions):
            apply('templates/page.galleries.json', section_id, block_id, {title_key: title, sub_key: sub})

# Showroom: visible buy buttons (audit #19), placed after the variant picker
entry = doc('templates/product.showroom.json')
if entry:
    main = entry[1]['sections'].get('main')
    if main and not any(b.get('type') == 'buy_buttons' for b in main.get('blocks', {}).values()):
        main['blocks']['buy_buttons'] = {'type': 'buy_buttons', 'settings': {'show_quantity': True}}
        order = main.setdefault('block_order', [])
        position = order.index('variant_picker') + 1 if 'variant_picker' in order else len(order)
        order.insert(position, 'buy_buttons')
        if 'door_sample' in order and 'ctas' in order:
            order.remove('door_sample')
            order.insert(order.index('ctas') + 1, 'door_sample')
        entry[2] = True

# Search: suggested searches in both empty states (an empty panel looked broken)
entry = doc('templates/search.json')
if entry:
    main = entry[1]['sections'].get('main')
    if main is not None and not main.get('blocks'):
        suggestions = [('Kitchen cabinets', 'cabinet'), ('Faucets', 'faucet'), ('Sinks', 'sink'),
                       ('Range hoods', 'range hood'), ('Cabinet hardware', 'knobs')]
        main['blocks'] = {f'q{i}': {'type': 'query', 'settings': {'label': label, 'query': query}}
                          for i, (label, query) in enumerate(suggestions, 1)}
        main['block_order'] = [f'q{i}' for i in range(1, len(suggestions) + 1)]
        entry[2] = True

# Demo stores must not use apps (Theme Store requirements): drop app embeds
# left behind by uninstalled apps (Judge.me, Wishlist Plus).
entry = doc('config/settings_data.json')
if entry and isinstance(entry[1].get('current'), dict):
    blocks = entry[1]['current'].get('blocks') or {}
    for block_id in [k for k, b in blocks.items() if str(b.get('type', '')).startswith('shopify://apps/')]:
        blocks.pop(block_id)
        entry[2] = True

# Favicon (audit E13)
entry = doc('config/settings_data.json')
if entry and isinstance(entry[1].get('current'), dict):
    current = entry[1]['current']
    if not current.get('kt_favicon'):
        current['kt_favicon'] = 'shopify://shop_images/favicon-kitchero.png'
        entry[2] = True

# Copy fixes that are found by text rather than by section id (the live
# template ids differ from main): American spelling (audit #10), statement
# headings instead of questions (#14), the cart note line while order notes
# are off, and no imposed "The Archives" eyebrow (#53).
PHRASES = [
    ('Need a Custom Quote?', 'Request a custom quote'),
    ('Review your items, add a note for our team, and check out securely.',
     'Review your items and check out securely.'),
]
EXACT = {'Catalogue': 'Catalog'}
EYEBROWS = {'blog': 'Journal', 'article': 'Journal', 'collection': 'Collection'}


def fix_text(node, rel, entry):
    if isinstance(node, dict):
        items = node.items()
    elif isinstance(node, list):
        items = enumerate(node)
    else:
        return
    for key, value in list(items):
        if isinstance(value, str):
            new = EXACT.get(value, value)
            for old, repl in PHRASES:
                new = new.replace(old, repl)
            if new == 'The Archives':
                kind = rel.split('/')[-1].split('.')[0]
                new = EYEBROWS.get(kind, '')
            if new != value:
                node[key] = new
                entry[2] = True
        else:
            fix_text(value, rel, entry)


import glob
import os
for path in sorted(glob.glob(f'{root}/templates/*.json') + glob.glob(f'{root}/sections/*.json')):
    rel = os.path.relpath(path, root)
    entry = doc(rel)
    if entry:
        fix_text(entry[1], rel, entry)

# Default collection page shows the collection description (audit #22)
entry = doc('templates/collection.json')
if entry:
    for section in entry[1].get('sections', {}).values():
        if section.get('type', '').startswith('main-collection'):
            settings = section.setdefault('settings', {})
            if settings.get('show_collection_description') is False:
                settings['show_collection_description'] = True
                entry[2] = True

for rel, entry in cache.items():
    if entry and entry[2]:
        with open(f'{root}/{rel}', 'w', encoding='utf-8') as handle:
            handle.write(entry[0] + json.dumps(entry[1], indent=2, ensure_ascii=False) + '\n')
        print('updated', rel)
