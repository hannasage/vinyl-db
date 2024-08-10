import { groupAndSortByProperty } from '@/utils/groupAndSortByProperty';
import { FullAlbumDetails } from '@/data/types';
import { removeArticles } from '@/utils/removeArticles';

export const SORTED_PAGES = [
    {label: "newest", slug: "newest"},
    {label: "artist(a-z)", slug: "artist-alphabetical"},
    {label: "orders+preorders", slug: "orders-preorders"}] as const
export type SortType = typeof SORTED_PAGES[number]

const isAcquired = (arg: FullAlbumDetails) => arg.acquired_date && new Date(arg.acquired_date).getTime() <= Date.now()
const isPreorder = (arg: FullAlbumDetails) => arg.preordered
const sortByTime = (aDate: Date, bDate: Date) => bDate.getTime() - aDate.getTime()

function sortRecentlyAdded(args: FullAlbumDetails[]) {
    return args
      .filter((arg) => isAcquired(arg))
      .sort((a, b) => sortByTime(new Date(a.acquired_date), new Date(b.acquired_date)))
}

function sortArtists(args: FullAlbumDetails[]) {
    const initialSort = groupAndSortByProperty<FullAlbumDetails>(args, "artist_name", "release_year");
    return initialSort.sort((ag1,  ag2) => {
        let artistA = removeArticles(ag1[0].artist_name);
        let artistB = removeArticles(ag2[0].artist_name);
        return artistA.localeCompare(artistB);
    }).flat()
}

function filterPreorders(args: FullAlbumDetails[]) {
    const { preorders, orders } = {
        preorders: [] as FullAlbumDetails[],
        orders: [] as FullAlbumDetails[]
    }
    args.filter((arg) =>
      (isPreorder(arg) && !isAcquired(arg)) || (!isPreorder(arg) && !isAcquired(arg)
    )).forEach(album => album.preordered ? preorders.push(album) : orders.push(album))
    return [
      ...orders
        .sort((a, b) =>
          sortByTime(new Date(a.created_at), new Date(b.created_at)
          )
        ),
      ...preorders.sort((a, b) =>
        sortByTime(new Date(b.acquired_date), new Date(a.acquired_date))
      )
    ]
}

export function sortLegacyEntries(args: FullAlbumDetails[], sort: SortType['slug']) {
    switch (sort) {
        case "newest":
            return sortRecentlyAdded(args)
        case "artist-alphabetical":
            return sortArtists(args)
        case "orders-preorders":
            return filterPreorders(args)
        default:
            // runtime invalid 'sort' type failure
            console.error(`sortLegacyEntries: invalid sort type ${sort} - data was returned unsorted`)
            return args // no sort
    }
}