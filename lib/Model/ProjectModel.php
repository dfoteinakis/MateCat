<?php

use API\V2\Exceptions\AuthorizationError;
use Features\QaCheckBlacklist\BlacklistFromZip;
use Teams\MembershipDao;
use Teams\MembershipStruct;
use Teams\TeamDao;

class ProjectModel {

    /**
     * @var Projects_ProjectStruct
     */
    protected $project_struct;

    protected $blacklist;

    protected $willChange = array();
    protected $changedFields = array();

    protected $cacheTeamsToClean = [];

    /**
     * @var Users_UserStruct
     */
    protected $user;

    public function __construct( Projects_ProjectStruct $project ) {
        $this->project_struct = $project;
    }

    public function getBlacklist() {
        // TODO: replace with check of file exitence, don't read whole file. 
        return BlacklistFromZip::getContent( $this->project_struct->getFirstOriginalZipPath() );
    }

    /**
     * Caches the information of blacklist file presence to project metadata.
     */
    public function saveBlacklistPresence() {
        $blacklist = $this->getBlacklist();

        if ( $blacklist ) {
            $this->project_struct->setMetadata( 'has_blacklist', '1' );
        }
    }

    public function resetUpdateList() {
        $this->willChange = array();
    }

    public function prepareUpdate( $field, $value ) {
        $this->willChange[ $field ] = $value;
    }

    public function setUser( $user ) {
        $this->user = $user ;
    }

    public function update() {
        $this->changedFields = array();

        $newStruct = new Projects_ProjectStruct( $this->project_struct->toArray() );

        if ( isset( $this->willChange[ 'name' ] ) ) {
            $this->checkName();
        }

        if ( isset( $this->willChange[ 'id_assignee' ] ) ) {
            $this->checkIdAssignee();
        }

        if( array_key_exists( 'id_assignee', $this->willChange ) ){
            $this->checkAssigneeChangeInPersonalTeam();
        }

        if ( isset( $this->willChange[ 'id_team' ] ) ) {
            $this->checkIdTeam();
        }

        foreach ( $this->willChange as $field => $value ) {
            $newStruct->$field = $value;
        }

        $result = Projects_ProjectDao::updateStruct( $newStruct, array(
            'fields' => array_keys( $this->willChange )
        ) );

        if ( $result ) {
            $this->changedFields = $this->willChange ;
            $this->willChange = array();

            $this->_sendNotificationEmails();
        }

        // TODO: handle case of update failure

        $this->project_struct = $newStruct;

        $this->cleanAssigneeCaches();

        return $this->project_struct;
    }

    protected function _sendNotificationEmails() {
        if (
            $this->changedFields['id_assignee'] &&
            !is_null($this->changedFields['id_assignee']) &&
            $this->user->uid != $this->changedFields['id_assignee']
        ) {
            $assignee = ( new Users_UserDao )->getByUid($this->changedFields['id_assignee']) ;
            $email = new \Email\ProjectAssignedEmail($this->user, $this->project_struct, $assignee );
            $email->send();
        }
    }

    private function checkName() {
        if ( empty( $this->willChange[ 'name' ] ) ) {
            throw new \Exceptions\ValidationError( 'Project name cannot be empty' );
        }
    }

    private function checkAssigneeChangeInPersonalTeam(){

        $teamDao = new TeamDao();
        $team = $teamDao->setCacheTTL( 60 * 60 * 24 )->findById( $this->project_struct->id_team );
        if( $team->type == Constants_Teams::PERSONAL ){
            throw new \Exceptions\ValidationError( 'Can\'t change the Assignee of a personal project.' );
        }

    }

    private function checkIdAssignee() {

        $membershipDao = new MembershipDao();
        $members       = $membershipDao->setCacheTTL( 60 )->getMemberListByTeamId( $this->project_struct->id_team );
        $id_assignee   = $this->willChange[ 'id_assignee' ];
        $found         = array_filter( $members, function ( MembershipStruct $member ) use ( $id_assignee ) {
            return ( $id_assignee == $member->uid );
        } );

        if ( empty( $found ) ) {
            throw new \Exceptions\ValidationError( 'Assignee must be team member' );
        }

        $this->cacheTeamsToClean[] = $this->project_struct->id_team;

    }

    private function checkIdTeam(){

        $memberShip = new MembershipDao();

        //choose this method ( and use array_filter ) instead of findTeamByIdAndUser because the results of this one are cached
        $memberList = $memberShip->setCacheTTL( 60 )->getMemberListByTeamId( $this->willChange[ 'id_team' ] );

        $found = array_filter( $memberList, function( $values ) {
            return $values->uid == $this->user->uid;
        } );

        if ( empty( $found ) ) {
            throw new AuthorizationError( "Not Authorized", 403 );
        }

        /**
         * @var $team \Teams\TeamStruct
         */
        $team = ( new TeamDao() )->setCacheTTL( 60 * 60 )->getPersonalByUid( $this->user->uid );

        // check if the destination team is personal, in such case set the assignee to the user UID
        if( $team->id == $this->willChange[ 'id_team' ] && $team->type == Constants_Teams::PERSONAL ){
            $this->willChange[ 'id_assignee' ] = $this->user->uid;
            $this->cacheTeamsToClean[] = $this->willChange[ 'id_team' ];
            $this->cacheTeamsToClean[] = $this->project_struct->id_team;
        }

        // if the project has an assignee abd the destination team is not personal,
        // we have to check if the assignee_id exists in the other team. If not, reset the assignee
        elseif( $this->project_struct->id_assignee ){

            $found = array_filter( $memberList, function( $values ) {
                return $this->project_struct->id_assignee == $values->uid;
            } );

            if( empty( $found )){
                $this->willChange[ 'id_assignee' ] = null; //unset the assignee
            } else {

                //clean the cache for the new team member list of assigned projects
                $this->cacheTeamsToClean[] = $this->willChange[ 'id_team' ];

            }

            //clean the cache for the old team member list of assigned projects
            $this->cacheTeamsToClean[] = $this->project_struct->id_team;

        }

    }

    private function cleanAssigneeCaches(){

        $teamDao = new TeamDao();
        $this->cacheTeamsToClean = array_unique( $this->cacheTeamsToClean );
        foreach( $this->cacheTeamsToClean as $team_id ){
            $teamInCacheToClean = $teamDao->setCacheTTL( 60 * 60 * 24 )->findById( $team_id );
            $teamDao->destroyCacheAssignee( $teamInCacheToClean );
        }

    }

}