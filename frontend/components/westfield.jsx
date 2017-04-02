import React from 'react';

const Westfield = () => {

  let links = {
    "Workday":"https://www.google.com",
    "Okta - Westfield Corp":"https://westfield.okta.com/app/UserHome",
    "Okta Preview":"https://westfieldlabs.oktapreview.com/app/UserHome",
    "Pure Safety":"https://westfield.puresafety.com/",

  }

  return (
    <div className="monitoring_links">
      <div className="link_heading"> Westfield </div>
      <ul>
        {Object.keys(links).map(function(key){
          return <li className="link"><a target="_blank" href={links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default Westfield;
