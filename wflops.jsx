import React from 'react';
import Monitoring from './frontend/components/monitoring.jsx'
import Organization from './frontend/components/organization.jsx'
import Core from './frontend/components/core.jsx'
import Github from './frontend/components/github.jsx'
import MiscLinks from './frontend/components/misc_links.jsx'
import OpsServices from './frontend/components/ops_services.jsx'
import Title from './frontend/components/title.jsx'
import Navbar from './frontend/components/navbar.jsx'
import Footer from './frontend/components/footer.jsx'

var requiredLinks = require("./master_links.js");
var links = requiredLinks.masterLinks()

const WFLOPS = () => {

  return (
      <div>
        <Navbar links={links.navbar}/>
        <Title />
        <div className='link_group'>
          <Core links={links.core}/>
          <OpsServices links={links.opsServices}/>
          <Monitoring links={links.monitoring}/>
          <Github links={links.github}/>
          <Organization links={links.organization}/>
          <MiscLinks links={links.miscLinks}/>
        </div>
        <Footer />
      </div>
  )
};

export default WFLOPS;
