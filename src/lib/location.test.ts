import { getLocationFromSearchParams } from './location'

describe('getLocationFromSearchParams', () => {
  it('returns a location when both latitude and longitude are present', () => {
    const searchParams = new URLSearchParams({
      latitude: '48.2082',
      longitude: '16.3738',
    })

    expect(getLocationFromSearchParams(searchParams)).toEqual({
      latitude: 48.2082,
      longitude: 16.3738,
    })
  })

  it('returns null when latitude is missing', () => {
    const searchParams = new URLSearchParams({ longitude: '16.3738' })

    expect(getLocationFromSearchParams(searchParams)).toBeNull()
  })

  it('returns null when longitude is missing', () => {
    const searchParams = new URLSearchParams({ latitude: '48.2082' })

    expect(getLocationFromSearchParams(searchParams)).toBeNull()
  })

  it('returns null when neither is present', () => {
    const searchParams = new URLSearchParams()

    expect(getLocationFromSearchParams(searchParams)).toBeNull()
  })

  it('returns null rather than NaN coordinates for an empty-string param', () => {
    // Matches the URL shape produced by an empty query param, e.g. ?latitude=
    const searchParams = new URLSearchParams({
      latitude: '',
      longitude: '16.3738',
    })

    expect(getLocationFromSearchParams(searchParams)).toBeNull()
  })
})
