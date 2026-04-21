import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  let url = ''

  if (type === 'reverse') {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  } else if (type === 'search') {
    const q = searchParams.get('q')

    url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}`
  } else {
    return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NutechMonitoringApp/1.0 (dev@nutech.com)',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    })

    if (!response.ok) {
      console.error(`Nominatim Error: ${response.status} ${response.statusText}`)

      return NextResponse.json({ error: `Geocoding API Error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Fetch Error:', error)

    return NextResponse.json({ error: 'Failed to fetch data from Geocoding API' }, { status: 500 })
  }
}
