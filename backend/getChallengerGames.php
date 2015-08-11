<?php
//Loads all games from the challenger scene

define('apikey', '586229bd-69d8-4be3-accf-701a8346822c');
require('../mysql.php');
require('../php-lol-api-master/lol.api.php');

$api = new LeagueOfLegends(apikey, 'euw');

$challengers = $api->getChallengerLeague();
$games = array();
$i = 0;

foreach( $challengers->entries as $player )
{
    if($i++ < 10) {
        $recent = $api->getRecentGames( $player->playerOrTeamId );
        
        if(isset($recent->status) && $recent->status->status_code == 429)
        {
            sleep(10);
            $recent = $api->getRecentGames( $player->playerOrTeamId );
        }
        if( $recent != false )
        {
            foreach( $recent->games as $game )
            {
                //only add ranked games on SR
                if( $game->subType == "RANKED_SOLO_5x5" || $game->subType == "RANKED_PREMADE_5x5" )
                {
                    $detailedGame = $api->getMatch( $game->gameId );
                    
                    if(isset($detailedGame->status) && $detailedGame->status->status_code == 429)
                    {
                        sleep(10);
                        $detailedGame = $api->getMatch( $game->gameId );
                    }
                    array_push($games, $detailedGame);
                }
            }
        }
    }
}

if( count($games) > 0 )
{
    $db = new Database();
    $inserted = $db->insertGames($games);
    echo($inserted . " games added");
}
else
    echo("No games added");
?>