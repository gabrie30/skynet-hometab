import React from 'react';

const Westfield = () => {

  let links = {
    "Workday":"https://www.google.com",
    "Okta - Westfield Corp":"https://westfield.okta.com/app/UserHome",
    "Okta Preview":"https://westfieldlabs.oktapreview.com/app/UserHome",
    "Pure Safety":"https://westfield.puresafety.com/",
    "Payroll Calendar":"https://drive.google.com/a/westfield.com/file/d/0Byu2WqMaf8OheVN5dTdwdFFaYlk/view?usp=sharing",
    "Holiday Calendar":"https://drive.google.com/a/westfield.com/file/d/0Byu2WqMaf8OhVHdyUWNuVzlCWnc/view?usp=sharing"

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
