import { useState } from 'react'
import { MapPin, Calendar, Users, Search } from 'lucide-react'

export default function BookingSearchCard() {
  const [searchData, setSearchData] = useState({
    destination: '',
    date: '',
    travelers: '1',
  })

  const handleSearch = () => {
    console.log('Searching with:', searchData)
    // Navigation to queries page with search params
  }

  return (
    <div className="bg-gradient-primary p-8 rounded-3xl shadow-2xl text-white">
      <h2 className="text-3xl font-bold mb-2">
        Discover your new <br />
        favorite stay
      </h2>
      <p className="text-white/90 mb-6">Book hotels, flights & travel packages</p>

      <div className="space-y-4">
        {/* Destination */}
        <div className="relative">
          <label className="block text-sm font-medium mb-2">Where to?</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Dubai, Thailand, Paris..."
              value={searchData.destination}
              onChange={(e) =>
                setSearchData({ ...searchData, destination: e.target.value })
              }
              className="w-full pl-11 pr-4 py-3 bg-white/95 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Date */}
        <div className="relative">
          <label className="block text-sm font-medium mb-2">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={searchData.date}
              onChange={(e) => setSearchData({ ...searchData, date: e.target.value })}
              className="w-full pl-11 pr-4 py-3 bg-white/95 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>

        {/* Travelers */}
        <div className="relative">
          <label className="block text-sm font-medium mb-2">Travelers</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={searchData.travelers}
              onChange={(e) =>
                setSearchData({ ...searchData, travelers: e.target.value })
              }
              className="w-full pl-11 pr-4 py-3 bg-white/95 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none"
            >
              <option value="1">1 Traveler</option>
              <option value="2">2 Travelers</option>
              <option value="3">3 Travelers</option>
              <option value="4">4+ Travelers</option>
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="w-full bg-white text-red-600 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 shadow-xl"
        >
          <Search className="h-5 w-5" />
          <span>Search</span>
        </button>
      </div>
    </div>
  )
}
