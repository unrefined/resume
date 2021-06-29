let hub = (() => {

  const getUrl = 'https://candidate.hubteam.com/candidateTest/v3/problem/dataset?userKey=50b09a8023998702862558687c0b';
  const postUrl = 'https://candidate.hubteam.com/candidateTest/v3/problem/result?userKey=50b09a8023998702862558687c0b';

  let partnerList;

  const go = () => {
    return receive()
      .then(data => process(data.partners))
      .then(processedData => send(processedData))
      .then(response => response.json())
      .then(data => console.log('SENT', data) )
  }

  const receive = async () => {
    return fetch(getUrl)
      .then(response => response.json())
  }

  const send = (postData) => {
    return fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })
  }

  const process = (partners) => {
    partnerList = attendeesByCountry(partners);
    const countries = Object.entries(partnerList).map(country => {
      return makeCountry(country[0]);
    })
    return { countries };
  }

  const attendeesByCountry = partners => {
    let countries = {};
    partners.forEach(partner => {
      const countryBucket = countries[partner.country] || [];
      countries[partner.country] = countryBucket;
      partner.validDates = validAttendeeDates(partner);
      countryBucket.push(partner);
    })
    return countries;
  }

  const validAttendeeDates = attendee => {
    return attendee.availableDates.filter(dateStr => {
      const doy = dayOfYear(dateStr);
      const availableDoys = attendee.availableDates.map(availDateStr => dayOfYear(availDateStr))
      return availableDoys.indexOf(doy+1) >= 0;
    })
  }

  const getBestDateByCountry = country => {
    const validDates = partnerList[country].map(person => person.validDates).flat().sort();
    const counts = {};
    validDates.forEach((dateStr, i) => {
      const count = counts[dateStr] || 0;
      counts[dateStr] = count + 1;
    });

    // The result of this sort did not take into account the 'earliest' best date
    const sorted = Object.entries(counts)
      .sort(([,a],[,b]) => a-b)
      .reverse();

    // This is kind of hacky but I needed to make sure that I got the highest count so that I could sort between only the valid matches
    const biggestCount = sorted[0][1]

    return sorted.filter(item => item[1] === biggestCount).map(item => item[0]).sort()[0];
  }

  const getAttendeeByValidDateStr = (country, dateStr) => {
    return partnerList[country]
      .filter(person => person.validDates.indexOf(dateStr) >= 0)
      .map(person => person.email);
  }

// This solution wont scale if the dates span across a year boundary but since they are all in one year I converted them to an easily comparable index
  const dayOfYear = dateStr => {
    const date = new Date(...dateStr.split('-'))
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
  }

  const makeCountry = (country) => {
    const bestDate = getBestDateByCountry(country);
    const attendees =  getAttendeeByValidDateStr(country, bestDate);
    return {
      attendeeCount: attendees.length,
      attendees: attendees,
      name: country,
      startDate: bestDate
    }
  }

  return {
    go: go
  };
})();

hub.go();
