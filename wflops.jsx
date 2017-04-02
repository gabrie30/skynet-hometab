import React from 'react';
import Monitoring from './frontend/components/monitoring.jsx'
import Westfield from './frontend/components/westfield.jsx'
import Core from './frontend/components/core.jsx'
import Github from './frontend/components/github.jsx'
import MiscLinks from './frontend/components/misc_links.jsx'
import OpsServices from './frontend/components/ops_services.jsx'
import Title from './frontend/components/title.jsx'
const WFLOPS = () => {

  return (
      <div>
        <Title />
        <div className='link_group'>
          <Core />
          <OpsServices />
          <Monitoring />
          <Github />
          <Westfield />
          <MiscLinks />
        </div>
      </div>
  )
};

export default WFLOPS;
