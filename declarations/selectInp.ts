
    export type countryInp = {
      
      cities: number | cityInp
citiesByPopulation: number | cityInp
capital: number | cityInp
users: number | userInp
usersByAge: number | userInp
    }

    export type cityInp = {
      country: number | countryInp
      users: number | userInp
lovedByUser: number | userInp
    }

    export type userInp = {
      livedCities: number | cityInp
mostLovedCity: number | cityInp
livedCountry: number | countryInp
      
    }
