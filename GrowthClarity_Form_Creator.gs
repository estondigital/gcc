
/**
 * GrowthClarity Co. — Revenue Growth Audit Form Creator
 * ─────────────────────────────────────────────────────
 * HOW TO USE:
 * 1. Go to script.google.com
 * 2. Paste this entire script
 * 3. Click Run → createGrowthAuditForm
 * 4. Grant permissions when prompted
 * 5. Check the Execution Log for your form URL
 */

function createGrowthAuditForm() {

  // ── CREATE FORM ──────────────────────────────────────
  var form = FormApp.create('Revenue Growth Audit — GrowthClarity Co.');

  form.setDescription(
    'This isn't a sales call. It's a 45-minute focused diagnostic of your GTM system. ' +
    'Fill this out so we can make the conversation worth your time.\n\n' +
    'Jithin will review every submission personally and respond within 24 hours.'
  );

  form.setConfirmationMessage(
    'We\'ve received your request. Jithin will review it personally and reach out within ' +
    '24 hours with a calendar link.\n\nIf it\'s urgent, connect directly on LinkedIn: ' +
    'linkedin.com/in/jithingeorge-marketing-strategist'
  );

  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);
  form.setShuffleQuestions(false);
  form.setCollectEmail(false); // we ask for email manually for better control

  // ── SECTION 1: ABOUT YOU ─────────────────────────────
  form.addSectionHeaderItem()
    .setTitle('About You')
    .setHelpText('Tell us who you are. This helps us prepare before the call.');

  form.addTextItem()
    .setTitle('Full Name')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Work Email')
    .setHelpText('We\'ll send the calendar invite and pre-call brief here.')
    .setRequired(true);

  var roleItem = form.addListItem();
  roleItem.setTitle('Your Role')
    .setRequired(true)
    .setChoices([
      roleItem.createChoice('Founder / CEO'),
      roleItem.createChoice('Co-Founder / CTO'),
      roleItem.createChoice('Head of Marketing'),
      roleItem.createChoice('Head of Growth'),
      roleItem.createChoice('VP Sales'),
      roleItem.createChoice('VP Marketing'),
      roleItem.createChoice('Product Manager / PMM'),
      roleItem.createChoice('Other (please specify below)')
    ]);

  form.addTextItem()
    .setTitle('Company Name')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Company Website')
    .setHelpText('e.g. https://yourcompany.com')
    .setRequired(true);

  form.addTextItem()
    .setTitle('LinkedIn Profile URL')
    .setHelpText('Helps us research your company before the call.')
    .setRequired(false);

  // ── SECTION 2: YOUR SAAS CONTEXT ────────────────────
  form.addSectionHeaderItem()
    .setTitle('Your SaaS Context')
    .setHelpText('Be honest — there are no wrong answers. This shapes the entire conversation.');

  var verticalItem = form.addMultipleChoiceItem();
  verticalItem.setTitle('SaaS Vertical')
    .setRequired(true)
    .setChoices([
      verticalItem.createChoice('HR SaaS'),
      verticalItem.createChoice('Fintech SaaS'),
      verticalItem.createChoice('EdTech SaaS'),
      verticalItem.createChoice('Healthcare SaaS'),
      verticalItem.createChoice('AI SaaS'),
      verticalItem.createChoice('Other B2B SaaS')
    ]);

  var arrItem = form.addMultipleChoiceItem();
  arrItem.setTitle('Current ARR (Annual Recurring Revenue)')
    .setRequired(true)
    .setChoices([
      arrItem.createChoice('Pre-revenue / < $100K'),
      arrItem.createChoice('$100K – $500K'),
      arrItem.createChoice('$500K – $2M'),
      arrItem.createChoice('$2M – $5M'),
      arrItem.createChoice('$5M – $20M'),
      arrItem.createChoice('$20M+')
    ]);

  var teamItem = form.addMultipleChoiceItem();
  teamItem.setTitle('Marketing + Sales team size')
    .setRequired(true)
    .setChoices([
      teamItem.createChoice('Just me (founder-led)'),
      teamItem.createChoice('2–5 people'),
      teamItem.createChoice('6–15 people'),
      teamItem.createChoice('15+ people')
    ]);

  // ── SECTION 3: THE REAL PROBLEM ─────────────────────
  form.addSectionHeaderItem()
    .setTitle('The Real Problem')
    .setHelpText('The more specific you are here, the more valuable the audit will be.');

  var challengeItem = form.addCheckboxItem();
  challengeItem.setTitle('What is your biggest growth challenge right now?')
    .setHelpText('Select all that apply.')
    .setRequired(true)
    .setChoices([
      challengeItem.createChoice('Pipeline is thin or unpredictable'),
      challengeItem.createChoice('CAC keeps rising'),
      challengeItem.createChoice('Win rate is low or declining'),
      challengeItem.createChoice('Sales cycles are too long'),
      challengeItem.createChoice('High churn / weak Net Revenue Retention'),
      challengeItem.createChoice('Messaging feels generic — not converting'),
      challengeItem.createChoice('Sales and marketing are misaligned'),
      challengeItem.createChoice('Don\'t know which channel to prioritise'),
      challengeItem.createChoice('ICP is unclear or too broad')
    ]);

  var icpItem = form.addScaleItem();
  icpItem.setTitle('How would you rate your ICP (Ideal Customer Profile) clarity?')
    .setHelpText('1 = We sell to anyone who will buy   →   5 = Laser-sharp, validated ICP with trigger events')
    .setBounds(1, 5)
    .setLabels('No clarity', 'Laser-sharp')
    .setRequired(true);

  var winRateItem = form.addMultipleChoiceItem();
  winRateItem.setTitle('What is your approximate sales win rate?')
    .setHelpText('Deals won ÷ deals entered into pipeline.')
    .setRequired(true)
    .setChoices([
      winRateItem.createChoice('Below 10%'),
      winRateItem.createChoice('10–20%'),
      winRateItem.createChoice('20–30%'),
      winRateItem.createChoice('30–40%'),
      winRateItem.createChoice('40%+'),
      winRateItem.createChoice('We don\'t track this yet')
    ]);

  var cycleItem = form.addMultipleChoiceItem();
  cycleItem.setTitle('Average sales cycle length')
    .setRequired(true)
    .setChoices([
      cycleItem.createChoice('Under 2 weeks (self-serve)'),
      cycleItem.createChoice('2–4 weeks'),
      cycleItem.createChoice('1–3 months'),
      cycleItem.createChoice('3–6 months'),
      cycleItem.createChoice('Over 6 months')
    ]);

  var churnItem = form.addMultipleChoiceItem();
  churnItem.setTitle('What is your Net Revenue Retention (NRR)?')
    .setHelpText('NRR > 100% means expansion revenue outpaces churn.')
    .setRequired(true)
    .setChoices([
      churnItem.createChoice('Below 80% (high churn)'),
      churnItem.createChoice('80–90%'),
      churnItem.createChoice('90–100%'),
      churnItem.createChoice('100–115%'),
      churnItem.createChoice('115%+ (strong expansion)'),
      churnItem.createChoice('We don\'t track NRR yet')
    ]);

  form.addParagraphTextItem()
    .setTitle('What have you already tried to fix your growth problem?')
    .setHelpText('Be specific — campaigns, hires, agencies, repositioning experiments. No right answer.')
    .setRequired(false);

  // ── SECTION 4: FIT & INTENT ──────────────────────────
  form.addSectionHeaderItem()
    .setTitle('Fit & Intent')
    .setHelpText('We only take engagements where we can genuinely move the needle.');

  var outcomeItem = form.addMultipleChoiceItem();
  outcomeItem.setTitle('What is your primary desired outcome from this engagement?')
    .setRequired(true)
    .setChoices([
      outcomeItem.createChoice('Diagnose why pipeline is inconsistent'),
      outcomeItem.createChoice('Fix our messaging and positioning'),
      outcomeItem.createChoice('Build a repeatable demand generation system'),
      outcomeItem.createChoice('Align sales and marketing around a shared GTM system'),
      outcomeItem.createChoice('Reduce CAC and improve funnel conversion rates'),
      outcomeItem.createChoice('All of the above — full GTM system rebuild')
    ]);

  var timelineItem = form.addMultipleChoiceItem();
  timelineItem.setTitle('What is your timeline?')
    .setRequired(true)
    .setChoices([
      timelineItem.createChoice('I need this fixed in the next 30 days'),
      timelineItem.createChoice('1–3 months'),
      timelineItem.createChoice('Planning for next quarter'),
      timelineItem.createChoice('Just exploring for now')
    ]);

  var budgetItem = form.addMultipleChoiceItem();
  budgetItem.setTitle('Monthly budget range for GTM consulting')
    .setHelpText('Honest answer helps us scope the right engagement model.')
    .setRequired(true)
    .setChoices([
      budgetItem.createChoice('Not sure yet — need to understand scope first'),
      budgetItem.createChoice('Under ₹1L / ~$1,200'),
      budgetItem.createChoice('₹1L–₹2.5L / $1,200–$3,000'),
      budgetItem.createChoice('₹2.5L–₹5L / $3,000–$6,000'),
      budgetItem.createChoice('₹5L+ / $6,000+')
    ]);

  var sourceItem = form.addMultipleChoiceItem();
  sourceItem.setTitle('How did you find GrowthClarity Co.?')
    .setRequired(true)
    .setChoices([
      sourceItem.createChoice('LinkedIn — post or profile'),
      sourceItem.createChoice('Google Search'),
      sourceItem.createChoice('Referred by someone (please name them below)'),
      sourceItem.createChoice('The Growth Scorecard tool'),
      sourceItem.createChoice('LinkedIn Newsletter'),
      sourceItem.createChoice('Other')
    ]);

  form.addTextItem()
    .setTitle('If referred — who referred you?')
    .setHelpText('Optional, but we\'d love to thank them.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Anything else you want us to know before the call?')
    .setHelpText('Share context, constraints, or specific questions you want answered in the 45 minutes.')
    .setRequired(false);

  // ── LINK TO GOOGLE SHEET ─────────────────────────────
  var sheet = SpreadsheetApp.create('GrowthClarity — Audit Leads');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  // ── LOG OUTPUT ───────────────────────────────────────
  var formUrl  = form.getPublishedUrl();
  var editUrl  = form.getEditUrl();
  var sheetUrl = sheet.getUrl();

  Logger.log('═══════════════════════════════════════');
  Logger.log('✅ FORM CREATED SUCCESSFULLY');
  Logger.log('═══════════════════════════════════════');
  Logger.log('📋 Form (share this): ' + formUrl);
  Logger.log('✏️  Edit form:        ' + editUrl);
  Logger.log('📊 Responses sheet:  ' + sheetUrl);
  Logger.log('═══════════════════════════════════════');
  Logger.log('NEXT STEPS:');
  Logger.log('1. Open the edit URL → Customise theme (dark/navy)');
  Logger.log('2. Add email notification: Responses tab → ⋮ → Get email notifications');
  Logger.log('3. Copy the embed URL and paste into contact.html');
  Logger.log('4. Share the form URL everywhere');

  // Show an alert in the script editor UI
  var ui = SpreadsheetApp.getUi ? SpreadsheetApp.getUi() : null;
  if (ui) {
    ui.alert('Form Created!', 
      'Form URL: ' + formUrl + '\n\nCheck the Execution Log for all details.',
      ui.ButtonSet.OK);
  }
}

/**
 * BONUS: Set up email notification trigger
 * Run this AFTER createGrowthAuditForm if you want
 * instant email alerts on every submission.
 */
function setupEmailNotification() {
  // Get the most recently created form
  var forms = DriveApp.getFilesByType('application/vnd.google-apps.form');
  var latestForm = null;
  var latestDate = new Date(0);
  
  while (forms.hasNext()) {
    var f = forms.next();
    if (f.getDateCreated() > latestDate) {
      latestDate = f.getDateCreated();
      latestForm = f;
    }
  }
  
  if (latestForm) {
    var form = FormApp.openById(latestForm.getId());
    ScriptApp.newTrigger('onFormSubmit')
      .forForm(form)
      .onFormSubmit()
      .create();
    Logger.log('✅ Email trigger set up for form: ' + form.getTitle());
  }
}

/**
 * This runs automatically on every form submission
 * and sends a notification email to you.
 */
function onFormSubmit(e) {
  var ownerEmail = 'jithin@growthclarityco.com'; // ← UPDATE THIS
  var responses  = e.response.getItemResponses();
  
  var name    = '';
  var email   = '';
  var company = '';
  var arr     = '';
  var challenge = '';
  
  var body = '🔔 NEW REVENUE GROWTH AUDIT REQUEST\n';
  body += '═══════════════════════════════════\n\n';
  
  responses.forEach(function(r) {
    var title = r.getItem().getTitle();
    var answer = r.getResponse();
    if (Array.isArray(answer)) answer = answer.join(', ');
    body += title + ':\n' + answer + '\n\n';
    
    if (title === 'Full Name') name = answer;
    if (title === 'Work Email') email = answer;
    if (title === 'Company Name') company = answer;
    if (title === 'Current ARR') arr = answer;
    if (title.includes('biggest growth challenge')) challenge = answer;
  });
  
  body += '\n═══════════════════════════════════\n';
  body += 'Submitted: ' + new Date().toLocaleString() + '\n';
  body += 'Reply to: ' + email;
  
  var subject = '🔔 New Audit Lead — ' + name + ' @ ' + company + ' (' + arr + ')';
  
  MailApp.sendEmail({
    to: ownerEmail,
    replyTo: email,
    subject: subject,
    body: body
  });
  
  // Auto-reply to lead
  if (email) {
    var leadBody = 'Hi ' + name + ',\n\n';
    leadBody += 'Thanks for requesting a Revenue Growth Audit.\n\n';
    leadBody += 'I\'ve received your submission and will review it personally. ';
    leadBody += 'You\'ll hear from me within 24 hours with a calendar link.\n\n';
    leadBody += 'In the meantime, if you haven\'t taken the Growth Scorecard yet, ';
    leadBody += 'it takes 3 minutes and gives you an immediate score on your GTM system:\n';
    leadBody += 'https://growthclarityco.com/scorecard.html\n\n';
    leadBody += 'Talk soon,\n';
    leadBody += 'Jithin George\n';
    leadBody += 'GTM System Architect · GrowthClarity Co.\n';
    leadBody += 'https://growthclarityco.com';
    
    MailApp.sendEmail({
      to: email,
      subject: 'Got your audit request — will be in touch within 24h',
      body: leadBody
    });
  }
}
