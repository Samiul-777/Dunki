<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'tracking_id',
        'destination',
        'agency',
        'verification_status',
        'verification_document_path',
        'verification_note',
        'verified_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'verified_at' => 'datetime',
        ];
    }
    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }
    public function documents()
    {
        return $this->hasMany(Document::class);
    }
    public function postedJobs()
    {
        return $this->hasMany(JobListing::class, 'creator_id');
    }

    public function applications()
    {
        return $this->hasMany(JobApplication::class, 'applicant_id');
    }
}
