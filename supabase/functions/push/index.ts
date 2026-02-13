// Edge Function to send push notifications via Expo
// Triggered by database webhook when notifications are inserted

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Push notification function started')

interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  created_at: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Notification
  schema: 'public'
  old_record: null | Notification
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json()
    console.log('Received webhook payload:', payload)

    // Get user's push token from Users table
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('expo_push_token')
      .eq('id', payload.record.user_id)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!user?.expo_push_token) {
      console.log('No push token found for user:', payload.record.user_id)
      return new Response(
        JSON.stringify({ error: 'No push token registered' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send push notification via Expo
    console.log('Sending push notification to:', user.expo_push_token)
    
    const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: user.expo_push_token,
        sound: 'default',
        title: payload.record.title,
        body: payload.record.body,
        data: { notificationId: payload.record.id },
      }),
    })

    const result = await expoPushResponse.json()
    console.log('Expo push response:', result)

    if (!expoPushResponse.ok) {
      console.error('Expo push failed:', result)
      return new Response(
        JSON.stringify({ error: 'Push notification failed', details: result }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in push function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})