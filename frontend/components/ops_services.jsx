import React from 'react';

const OpsServices = () => {

  let links = {
    "Create":"https://create.westfield.io/",
    "Deliver":"https://deliver.westfield.io",
    "Pager Duty Service":"http://pagerduty-service.herokuapp.com/pagerduty",
    "Redirect Service":"https://redis-redirect-service.uat.wflops.net/",

  }

  return (
    <div className="monitoring_links">
      <div className="link_heading"> Ops Services </div>
      <ul>
        {Object.keys(links).map(function(key){
          return <li className="link"><a target="_blank" href={links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default OpsServices;
