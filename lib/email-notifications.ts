// Email notification system using Resend (or any email provider)

interface DailyReminderData {
  userEmail: string
  todayContent: any
  kpiProgress: any
  tomorrowContent?: any
}

export async function sendDailyReminder(data: DailyReminderData) {
  // If using Resend
  if (process.env.RESEND_API_KEY) {
    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    await resend.emails.send({
      from: 'Multi-Agent System <notifications@yourdomain.com>',
      to: data.userEmail,
      subject: '📅 Today\'s Content Ready!',
      html: generateEmailHTML(data)
    })
  } else {
    // Fallback: log to console (for development)
    console.log('Daily reminder email:', data)
  }
}

function generateEmailHTML(data: DailyReminderData): string {
  const { todayContent, kpiProgress } = data
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .post-content { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .kpi { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>☀️ Good Morning!</h1>
          <p>Your daily content is ready to publish</p>
        </div>
        
        <div class="content">
          ${kpiProgress ? `
            <div class="kpi">
              <h3>🎯 KPI Progress</h3>
              <p><strong>${kpiProgress.name}</strong></p>
              <p>${kpiProgress.current} / ${kpiProgress.target} ${kpiProgress.unit} (${kpiProgress.percentage}%)</p>
              <p>${kpiProgress.daysLeft} days left</p>
            </div>
          ` : ''}
          
          ${todayContent ? `
            <h2>✍️ Today's Content</h2>
            <p><strong>${todayContent.content_type}</strong> - ${new Date(todayContent.publish_date).toLocaleDateString()}</p>
            <h3>${todayContent.title}</h3>
            
            <div class="post-content">
              <pre style="white-space: pre-wrap; font-family: inherit;">${todayContent.content}</pre>
            </div>
            
            ${todayContent.audience_insights ? `
              <p><small>📌 Addresses: ${todayContent.audience_insights.pain_point}</small></p>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
                Open Dashboard
              </a>
            </div>
          ` : `
            <p>No content scheduled for today. Enjoy your day off! 🎉</p>
          `}
        </div>
        
        <div class="footer">
          <p>Multi-Agent Marketing System</p>
          <p>You're receiving this because you have active agents</p>
        </div>
      </div>
    </body>
    </html>
  `
}
