import React from 'react';

const Monitoring = () => {

  let links = {
    "New Relic":"https://www.newrelic.com",
    "Nagios":"https://monitoring.wflops.net/nagios/",
    "Internal Status Page":"https://westfieldlabsinternal.statuspage.io/#",
    "AEM Deploy Status (vpn)":"http://aem-deploy-status.internal.wflops.net/",
  }

  return (
    <div className="monitoring_links">
      <div className="link_heading"> Monitoring </div>
      <ul>
        {Object.keys(links).map(function(key){
          return <li className="link"><a target="_blank" href={links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default Monitoring;
