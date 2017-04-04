import React from 'react';
import Monitoring from './frontend/components/monitoring.jsx'
import Westfield from './frontend/components/westfield.jsx'
import Core from './frontend/components/core.jsx'
import Github from './frontend/components/github.jsx'
import MiscLinks from './frontend/components/misc_links.jsx'
import OpsServices from './frontend/components/ops_services.jsx'
import Title from './frontend/components/title.jsx'
import Navbar from './frontend/components/navbar.jsx'
import Footer from './frontend/components/footer.jsx'

// Can add footer below
const WFLOPS = () => {

  return (
      <div>
        <Navbar />
        <Title />
        <div className='link_group'>
          <Core />
          <OpsServices />
          <Monitoring />
          <Github />
          <Westfield />
          <MiscLinks />
        </div>
        <Footer />
      </div>
  )
};

export default WFLOPS;
