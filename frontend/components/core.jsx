import React from 'react';

const Core = () => {

  let links = {
    "AWS":"https://westfieldlabs.okta.com/home/amazon_aws/0oa180m5dmtrIrcDq1d8/272",
    "Okta":"https://westfieldlabs.okta.com/app/UserHome",
    "Heroku":"https://www.heroku.com",
    "Splunk":"https://westfieldlabs.splunkcloud.com",
    "Daux":"https://docs.wflops.net/Production_Operations",
  }

  return (
    <div className="monitoring_links">
      <div className="link_heading"> Core Links </div>
      <ul>
        {Object.keys(links).map(function(key){
          return <li className="link"><a target="_blank" href={links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default Core;
