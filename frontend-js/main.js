import Search from './modules/search'

// set up to only happen if the luser is logged in. search icon is only available if luser is logged in... yay
// new Search()
if (document.querySelector('.header-search-icon')) {new Search()}
