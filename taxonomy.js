/* Tool Crizib shared taxonomy: battery platforms + tool types. Used by the app and by tools/build-catalog.js. */
(function (root) {
  'use strict';
  const PLATFORMS = [
    { id: 'ryobi-18v', brand: 'RYOBI', name: 'ONE+ 18V', short: 'ONE+', v: 18, note: 'ONE+ and ONE+ HP tools all take the same 18V ONE+ batteries.' },
    { id: 'ryobi-40v', brand: 'RYOBI', name: '40V', short: '40V', v: 40, note: '40V and 40V HP tools share the 40V batteries.' },
    { id: 'ryobi-80v', brand: 'RYOBI', name: '80V', short: '80V', v: 80, note: '80V riding mowers and equipment use 80V batteries only.' },
    { id: 'ryobi-usb', brand: 'RYOBI', name: 'USB Lithium', short: 'USB', note: 'USB Lithium tools charge over USB and swap USB Lithium batteries.' },
    { id: 'ryobi-12v', brand: 'RYOBI', name: '12V (older)', short: '12V', v: 12, note: 'Older RYOBI 12V lithium tools and batteries.' },
    { id: 'ryobi-9v6', brand: 'RYOBI', name: '9.6V (older)', short: '9.6V', v: 9.6 },
    { id: 'ryobi-4v', brand: 'RYOBI', name: '4V (older)', short: '4V', v: 4, note: 'Older RYOBI 4V lithium screwdrivers and lights.' },
    { id: 'ryobi-none', brand: 'RYOBI', name: 'Corded / gas / no battery', short: 'Corded', none: true },
    { id: 'mil-m18', brand: 'Milwaukee', name: 'M18', short: 'M18', v: 18, note: 'M18, M18 FUEL and M18 FUEL ONE-KEY tools all take M18 REDLITHIUM batteries (incl. FORGE, HIGH OUTPUT, XC).' },
    { id: 'mil-m12', brand: 'Milwaukee', name: 'M12', short: 'M12', v: 12, note: 'M12 and M12 FUEL tools take M12 REDLITHIUM batteries.' },
    { id: 'mil-mxf', brand: 'Milwaukee', name: 'MX FUEL', short: 'MX FUEL', note: 'MX FUEL equipment uses MX FUEL batteries only.' },
    { id: 'mil-m4', brand: 'Milwaukee', name: 'M4', short: 'M4', v: 4 },
    { id: 'mil-usb', brand: 'Milwaukee', name: 'REDLITHIUM USB', short: 'USB', note: 'USB-rechargeable REDLITHIUM batteries and tools.' },
    { id: 'mil-none', brand: 'Milwaukee', name: 'Corded / no battery', short: 'Corded', none: true },
  ];
  const BRANDS = ['RYOBI', 'Milwaukee'];
  // Tool type -> group. Rules are tried in order against the lower-cased product name; first match wins.
  const R = (re, type, group) => ({ re, type, group });
  const RULES = [
    R(/^(?!.*(?:power source|inverter|power station)).*batter(?:y|ies)\b.{0,40}?(?:&|\band\b|\+|\bwith\b|w\/)\s*(?:\S+\s){0,3}?charger|\b\d+(?:\.\d)?\s?ah kit|starter kit|battery\s*(?:&|and|\+|w\/)\s*charger|batteries?\s*(?:&|and|\+)\s*charger|charger\s*(?:&|and|\+)\s*batter/, 'Battery & charger kit', 'Batteries'),
    R(/\bcharger\b|supercharger|charge station|charging station|charging hub|power station|power source|inverter|generator|solar panel|power supply|jump start/, 'Charger / power', 'Chargers & Power'),
    R(/\bbattery\b|\bbatteries\b|battery pack/, 'Battery', 'Batteries'),
    R(/combo kit|super combo|\d-tool kit|\d tool kit|-tool combo/, 'Combo kit', 'Combo Kits'),
    R(/hammer drill/, 'Hammer drill', 'Drills & Drivers'), R(/right angle drill|right-angle drill/, 'Right angle drill', 'Drills & Drivers'),
    R(/rotary hammer|sds|demolition hammer|breaker/, 'Rotary hammer', 'Drills & Drivers'),
    R(/impact driver|hex impact|hydraulic driver|surge/, 'Impact driver', 'Impact Tools'),
    R(/impact wrench|impact ratchet/, 'Impact wrench', 'Impact Tools'), R(/ratchet/, 'Ratchet', 'Impact Tools'),
    R(/drill\/driver|drill driver|\bdrill\b(?! bit)|screwdriver|drywall screw gun|screw gun/, 'Drill / driver', 'Drills & Drivers'),
    R(/torque wrench|digital torque/, 'Torque wrench', 'Impact Tools'),
    R(/circular saw|circulars saw|panel saw|flooring saw|worm drive|rear handle saw|track saw|plunge/, 'Circular saw', 'Saws'),
    R(/miter saw/, 'Miter saw', 'Saws'), R(/table saw/, 'Table saw', 'Saws'),
    R(/reciprocating saw|sawzall|hackzall|one-handed recip|recip saw/, 'Reciprocating saw', 'Saws'),
    R(/jig ?saw/, 'Jig saw', 'Saws'), R(/band ?saw/, 'Band saw', 'Saws'), R(/scroll saw/, 'Scroll saw', 'Saws'),
    R(/multi-?tool|oscillating/, 'Oscillating multi-tool', 'Saws'), R(/metal saw|cut-?off saw|chop saw|abrasive cut/, 'Metal / cut-off saw', 'Saws'),
    R(/chainsaw|chain saw|pole saw|pruning saw|hatchet|top handle saw|pruner|lopper|shears?\b(?!.*(metal|sheet))/, 'Chainsaw / pruner', 'Outdoor Power'),
    R(/grinder|cut[- ]?off tool|die grinder|bandfile/, 'Grinder / cut-off', 'Grinders & Cutting'),
    R(/rotary tool|rotary cut|rod cutter|speed saw|tubing cutter|cable stripper|power cutter|cutout tool|drywall cut|shear|nibbler|cable cutter|pipe cutter|rebar cutter|bolt cutter|cut-out/, 'Cutter / shear', 'Grinders & Cutting'),
    R(/sander|polisher|buffer/, 'Sander / polisher', 'Sanding & Finishing'),
    R(/router|trimmer router|laminate trimmer|planer|joiner|biscuit|jointer|power carver/, 'Router / planer', 'Woodworking'),
    R(/nailer|stapler|tacker|brad|pin nailer|nail gun/, 'Nailer / stapler', 'Nailers & Staplers'),
    R(/lawn mower|push mower|riding mower|zero turn|mower|tractor/, 'Mower', 'Outdoor Power'),
    R(/string trimmer|edger|weed eater|brush cutter|trimmer/, 'String trimmer / edger', 'Outdoor Power'),
    R(/blower|leaf vac|mulcher/, 'Blower', 'Outdoor Power'), R(/hedge/, 'Hedge trimmer', 'Outdoor Power'),
    R(/snow ?blower|snow shovel|snow thrower/, 'Snow blower', 'Outdoor Power'),
    R(/log splitter|power head|tiller|cultivator|auger|earth|post hole|dethatcher|aerator|garden hoe|edger/, 'Tiller / auger', 'Outdoor Power'),
    R(/pressure washer|spray mop|\bmop\b|carpet washer|carpet cleaner|spot cleaner|surface dryer|power cleaner|power washer|scrubber|power scrubber/, 'Pressure washer / scrubber', 'Vacuums & Cleaning'),
    R(/paint system|paint sprayer|sprayer|mister|spreader|fogger|watering/, 'Sprayer / spreader', 'Outdoor Power'),
    R(/vacuum|\bvac\b|dust extractor|wet\/dry|dust collector|air cleaner|air purifier/, 'Vacuum / dust', 'Vacuums & Cleaning'),
    R(/inflator|compressor|air pump|tire/, 'Inflator / compressor', 'Air & Inflation'),
    R(/flashlight|headlamp|spotlight|light|lantern|lamp|led/, 'Light', 'Lighting'),
    R(/groover|drum machine|no-hub|water supply|drain|auger|sewer|press tool|propress|pex|crimp|expansion|threader|pipe|plumb|transfer pump|utility pump|pump/, 'Plumbing / pipe', 'Plumbing & Drain'),
    R(/grease gun|caulk|adhesive|glue|heat gun|soldering|hot melt|fill|riveter|rivet|banding|strapping|wire stripper|cable tie|crimper|knockout|bender|fish tape|cable puller|dieless/, 'Specialty tool', 'Specialty'),
    R(/air cannon|zapper|camper|radio|speaker|audio|fan|heater|heated|cooler|jacket|hoodie|vest|glove|coffee|mister|kettle|blender|bluetooth|earbud/, 'Comfort / audio / heated', 'Audio, Fans & Comfort'),
    R(/temp-gun|thermometer|laser|level|meter|tester|detector|inspection|camera|thermal|scope|measur|stud finder|moisture/, 'Measuring / test', 'Measuring & Test'),
    R(/plate compactor|rammer|mixer|paddle|vibrator|concrete|screed|core drill|tile/, 'Concrete / mixing', 'Specialty'),
    R(/storage|packout|case|bag|organizer|tote|cart|box/, 'Storage', 'Storage'),
  ];
  const GROUPS = ['Drills & Drivers', 'Impact Tools', 'Saws', 'Grinders & Cutting', 'Sanding & Finishing', 'Woodworking', 'Nailers & Staplers', 'Outdoor Power',
    'Lighting', 'Vacuums & Cleaning', 'Air & Inflation', 'Plumbing & Drain', 'Specialty', 'Measuring & Test', 'Audio, Fans & Comfort', 'Combo Kits', 'Batteries', 'Chargers & Power', 'Storage', 'Other'];
  const TYPES = [...new Set(RULES.map(r => r.type))].concat(['Other tool']);
  const TYPE_GROUP = Object.fromEntries(RULES.map(r => [r.type, r.group]));
  function classify(name) {
    const n = String(name || '').toLowerCase().replace(/[™®]/g, '');
    // "Air Compressor with 4.0 Ah Battery and Charger": classify the tool, not what ships with it
    // "Dual Battery Mower", "2 Battery Kit", "Grease Gun Starter Kit": the tool, not the battery
    const noisy = n.replace(/dual[- ]battery|\b\d[- ]battery\b|battery topper|battery cordless|\/\d battery|starter kit/g, ' ');
    if (noisy !== n) for (const r of RULES) if (r.re.test(noisy) && !/^(Battery|Charger \/ power|Battery & charger kit)$/.test(r.type)) return { type: r.type, group: r.group };
    const core = n.replace(/\s*(?:,|\bwith\b|\bw\/|\(|\s-\s|\bincludes?\b).*?(?:batter|charger).*$/, '').trim();
    if (core && core !== n) for (const r of RULES) if (r.re.test(core) && !/^(Battery|Charger \/ power|Battery & charger kit)$/.test(r.type)) return { type: r.type, group: r.group };
    for (const r of RULES) if (r.re.test(n)) return { type: r.type, group: r.group };
    return { type: 'Other tool', group: 'Other' };
  }
  const groupOf = type => TYPE_GROUP[type] || (type ? classify(type).group : 'Other');
  const kindOf = type => type === 'Battery' ? 'battery' : type === 'Charger / power' ? 'charger' : 'tool';
  // battery capacity from a product name: "XC5.0", "HIGH OUTPUT XC8.0", "4Ah", "4.0 Ah", "CP2.0"
  function ahOf(name) {
    const n = String(name || '').replace(/[™®]/g, '');
    let m = n.match(/(\d+(?:\.\d+)?)\s*Ah\b/i) || n.match(/\b(?:XC|HD|CP)\s?(\d{1,2}\.\d)\b/i) || n.match(/\b(?:XC|CP)(\d)\b(?!\.)/i)
      || n.match(/\b(?:HIGH DEMAND|HIGH OUTPUT|REDLITHIUM|M4|M12|M18|USB)\s+(\d{1,2}\.\d)\b/i);
    return m ? Number(m[1]) : null;
  }
  function batTypeOf(name) {
    const n = String(name || '').toUpperCase().replace(/[™®]/g, '');
    const t = [];
    if (/FORGE/.test(n)) t.push('FORGE'); if (/HIGH OUTPUT/.test(n)) t.push('HIGH OUTPUT');
    if (/\bXC\s?\d/.test(n) || /EXTENDED CAPACITY/.test(n)) t.push('XC'); if (/\bHD\s?\d/.test(n)) t.push('HD'); if (/\bCP\s?\d/.test(n) || /COMPACT/.test(n)) t.push('CP');
    if (/\bEDGE\b/.test(n)) t.push('EDGE'); if (/LITHIUM\+|LITHIUM PLUS/.test(n)) t.push('LITHIUM+');
    if (/REDLITHIUM/.test(n) && !t.length) t.push('REDLITHIUM');
    if (/\bHP\b/.test(n)) t.push('HP');
    return t.join(' ');
  }
  function platformOf(brand, name, hint) {
    const n = String(name || '').toUpperCase().replace(/[™®]/g, ''), h = String(hint || '').toUpperCase();
    if (/RYOBI/i.test(brand)) {
      if (/\b80V\b/.test(n) || h === '80V') return 'ryobi-80v';
      if (/\b40V\b/.test(n) || h === '40V') return 'ryobi-40v';
      if (/\bUSB\b/.test(n) || /USB/.test(h)) return 'ryobi-usb';
      if (/\b18V\b|ONE\+/.test(n) || /18V|ONE\+/.test(h)) return 'ryobi-18v';
      if (/\b12V\b/.test(n)) return 'ryobi-12v';
      if (/\b9\.6V\b/.test(n)) return 'ryobi-9v6';
      if (/\b4V\b/.test(n)) return 'ryobi-4v';
      return 'ryobi-none';
    }
    if (/MILWAUKEE/i.test(brand)) {
      if (/MX FUEL/.test(n)) return 'mil-mxf';
      if (/\bM18\b/.test(n)) return 'mil-m18';
      if (/\bM12\b/.test(n)) return 'mil-m12';
      if (/\bM4\b/.test(n)) return 'mil-m4';
      if (/USB/.test(n)) return 'mil-usb';
      return 'mil-none';
    }
    return '';
  }
  // chargers / adapters that serve more than one platform ("M18 & M12 Multi-Voltage Charger")
  function alsoPlatforms(brand, name, main) {
    const n = String(name || '').toUpperCase().replace(/[™®]/g, ''), out = [];
    if (/MILWAUKEE/i.test(brand)) { if (/\bM18\b/.test(n)) out.push('mil-m18'); if (/\bM12\b/.test(n)) out.push('mil-m12'); if (/\bM4\b/.test(n)) out.push('mil-m4'); }
    if (/RYOBI/i.test(brand)) { if (/\b18V\b|ONE\+/.test(n)) out.push('ryobi-18v'); if (/\b40V\b/.test(n)) out.push('ryobi-40v'); if (/\bUSB\b/.test(n)) out.push('ryobi-usb'); }
    return out.filter(x => x !== main);
  }
  const lineOf = name => { const n = String(name || '').toUpperCase().replace(/[™®]/g, ''); const t = [];
    if (/MX FUEL/.test(n)) return 'MX FUEL'; if (/\bFUEL\b/.test(n)) t.push('FUEL'); if (/ONE-KEY/.test(n)) t.push('ONE-KEY'); if (/\bHP\b/.test(n)) t.push('HP'); if (/BRUSHLESS/.test(n)) t.push('Brushless'); if (/WHISPER/.test(n)) t.push('Whisper'); return t.join(' · '); };
  const api = { PLATFORMS, BRANDS, RULES, GROUPS, TYPES, TYPE_GROUP, classify, groupOf, kindOf, ahOf, batTypeOf, platformOf, alsoPlatforms, lineOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TL_TAX = api;
})(typeof self !== 'undefined' ? self : this);
